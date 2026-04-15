const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cryptoType: { type: String, required: true },
  amount: { type: Number, required: true }, // amount bought
  price: { type: Number, required: true }, // current price at time of purchase
  totalValue: { type: Number, required: true }, // amount * price
  timestamp: { type: Date, default: Date.now },
  paymentProvider: { type: String },
  paymentId: { type: String, sparse: true, unique: true },
  orderId: { type: String },
  paymentStatus: { type: String },
});

transactionSchema.index({ orderId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
