require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const viewDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all users
    const users = await User.find({}, "-password"); // Exclude password field
    console.log("\n=== USERS IN DATABASE ===");
    users.forEach((user) => {
      console.log(`ID: ${user._id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Created: ${user.createdAt}`);
      console.log("---");
    });

    // Get all transactions with user details
    const transactions = await Transaction.find().populate(
      "buyer",
      "username email",
    );
    console.log("\n=== TRANSACTIONS IN DATABASE ===");
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. Transaction ID: ${tx._id}`);
      console.log(`   Buyer: ${tx.buyer.username} (${tx.buyer.email})`);
      console.log(`   Crypto: ${tx.cryptoType}`);
      console.log(`   Amount: ${tx.amount}`);
      console.log(`   Price: $${tx.price}`);
      console.log(`   Total Value: $${tx.totalValue}`);
      console.log(`   Date: ${tx.timestamp}`);
      console.log("---");
    });

    console.log(`\nTotal Users: ${users.length}`);
    console.log(`Total Transactions: ${transactions.length}`);
  } catch (error) {
    console.error("Error viewing database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

viewDatabase();
