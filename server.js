require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const Razorpay = require("razorpay");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const app = express();
const PORT = process.env.PORT || 8080;

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, "secretkey", {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    const decoded = jwt.verify(token, "secretkey");
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/api/buy", authenticate, async (req, res) => {
  try {
    const { cryptoType, amount, price } = req.body;
    const totalValue = amount * price;
    const transaction = new Transaction({
      buyer: req.userId,
      cryptoType,
      amount,
      price,
      totalValue,
      paymentProvider: "demo",
      paymentStatus: "demo",
    });
    await transaction.save();
    res.status(201).json({ message: "Purchase recorded successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/** Razorpay: public key + whether checkout is available */
app.get("/api/payment/config", (req, res) => {
  res.json({
    enabled: Boolean(razorpay),
    keyId: razorpay ? process.env.RAZORPAY_KEY_ID : null,
    usdInrRate: Number(process.env.USD_INR_RATE) || 83,
  });
});

/** Create Razorpay order (amount derived on server; notes hold crypto order details) */
app.post("/api/payment/create-order", authenticate, async (req, res) => {
  if (!razorpay) {
    return res
      .status(503)
      .json({ error: "Payment gateway not configured on server" });
  }
  try {
    const { cryptoSymbol, quantity, priceUsd } = req.body;
    const qty = Number(quantity);
    const price = Number(priceUsd);
    if (!cryptoSymbol || typeof cryptoSymbol !== "string") {
      return res.status(400).json({ error: "Invalid crypto symbol" });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    const amountUsd = qty * price;
    const usdInr = Number(process.env.USD_INR_RATE) || 83;
    const amountInr = amountUsd * usdInr;
    let paise = Math.round(amountInr * 100);
    if (paise < 100) paise = 100;

    const receipt = `cm_${String(req.userId).slice(-8)}_${Date.now()}`.slice(
      0,
      40,
    );

    const order = await razorpay.orders.create({
      amount: paise,
      currency: "INR",
      receipt,
      notes: {
        cryptoSymbol: cryptoSymbol.toUpperCase(),
        quantity: String(qty),
        priceUsd: String(price),
        userId: String(req.userId),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      amountUsd,
      totalInr: amountInr,
    });
  } catch (error) {
    console.error("create-order:", error);
    res.status(500).json({ error: error.message || "Could not create order" });
  }
});

/**
 * Verify HMAC signature, fetch order + payment from Razorpay, then record purchase.
 */
app.post("/api/payment/verify", authenticate, async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ error: "Payment gateway not configured" });
  }
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const paymentEntity = await razorpay.payments.fetch(razorpay_payment_id);
    if (
      paymentEntity.order_id &&
      paymentEntity.order_id !== razorpay_order_id
    ) {
      return res.status(400).json({ error: "Order id mismatch" });
    }
    if (!["captured", "authorized"].includes(paymentEntity.status)) {
      return res.status(400).json({
        error: `Payment not completed (status: ${paymentEntity.status})`,
      });
    }

    const orderDetails = await razorpay.orders.fetch(razorpay_order_id);
    const notes = orderDetails.notes || {};
    if (!notes.userId || String(notes.userId) !== String(req.userId)) {
      return res.status(403).json({ error: "This order belongs to another user" });
    }

    const cryptoSymbol = (notes.cryptoSymbol || "").toUpperCase();
    const quantity = parseFloat(String(notes.quantity));
    const priceUsd = parseFloat(String(notes.priceUsd));
    if (!cryptoSymbol || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Invalid order metadata" });
    }
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return res.status(400).json({ error: "Invalid price in order" });
    }

    const existing = await Transaction.findOne({
      paymentId: razorpay_payment_id,
    });
    if (existing) {
      return res.json({
        message: "Payment already recorded",
        transactionId: existing._id,
      });
    }

    const totalValue = quantity * priceUsd;
    const transaction = new Transaction({
      buyer: req.userId,
      cryptoType: cryptoSymbol,
      amount: quantity,
      price: priceUsd,
      totalValue,
      paymentProvider: "razorpay",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentStatus: paymentEntity.status,
    });
    await transaction.save();

    res.status(201).json({
      message: "Payment verified and purchase recorded",
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("verify payment:", error);
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});
// Verify token endpoint
app.get("/api/verify", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Serve React app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Cryptomarket server running on port ${PORT}`);
  console.log(`Backend API: http://localhost:${PORT}`);
});

// Add error handling for port conflicts
process.on("uncaughtException", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please close the process or use a different port.`,
    );
  }
  process.exit(1);
});
