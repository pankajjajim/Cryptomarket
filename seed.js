require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Transaction = require("./models/Transaction");

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    console.log("Cleared existing data");

    // Create demo users
    const users = [
      {
        username: "john_doe",
        email: "john@example.com",
        password: "password123",
      },
      {
        username: "jane_smith",
        email: "jane@example.com",
        password: "password123",
      },
      {
        username: "crypto_trader",
        email: "trader@example.com",
        password: "password123",
      },
      {
        username: "alice_wonder",
        email: "alice@example.com",
        password: "password123",
      },
      {
        username: "bob_builder",
        email: "bob@example.com",
        password: "password123",
      },
      {
        username: "bobbuilder",
        email: "bb@example.com",
        password: "password13",
      },
    ];

    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      })),
    );

    const createdUsers = await User.insertMany(hashedUsers);
    console.log("Created demo users:", createdUsers.length);

    // Create demo transactions
    const transactions = [
      {
        buyer: createdUsers[0]._id,
        cryptoType: "Bitcoin",
        amount: 0.5,
        price: 45000,
        totalValue: 22500,
        timestamp: new Date("2024-01-15T10:30:00Z"),
      },
      {
        buyer: createdUsers[0]._id,
        cryptoType: "Ethereum",
        amount: 2.5,
        price: 3000,
        totalValue: 7500,
        timestamp: new Date("2024-01-20T14:15:00Z"),
      },
      {
        buyer: createdUsers[1]._id,
        cryptoType: "Bitcoin",
        amount: 0.25,
        price: 47000,
        totalValue: 11750,
        timestamp: new Date("2024-01-18T09:45:00Z"),
      },
      {
        buyer: createdUsers[1]._id,
        cryptoType: "Cardano",
        amount: 500,
        price: 1.2,
        totalValue: 600,
        timestamp: new Date("2024-01-22T16:20:00Z"),
      },
      {
        buyer: createdUsers[2]._id,
        cryptoType: "Solana",
        amount: 10,
        price: 150,
        totalValue: 1500,
        timestamp: new Date("2024-01-25T11:10:00Z"),
      },
      {
        buyer: createdUsers[2]._id,
        cryptoType: "Polkadot",
        amount: 50,
        price: 25,
        totalValue: 1250,
        timestamp: new Date("2024-01-28T13:30:00Z"),
      },
      {
        buyer: createdUsers[3]._id,
        cryptoType: "Chainlink",
        amount: 100,
        price: 15,
        totalValue: 1500,
        timestamp: new Date("2024-02-01T08:00:00Z"),
      },
      {
        buyer: createdUsers[3]._id,
        cryptoType: "Uniswap",
        amount: 75,
        price: 8,
        totalValue: 600,
        timestamp: new Date("2024-02-05T12:45:00Z"),
      },
      {
        buyer: createdUsers[4]._id,
        cryptoType: "Avalanche",
        amount: 20,
        price: 35,
        totalValue: 700,
        timestamp: new Date("2024-02-08T15:20:00Z"),
      },
      {
        buyer: createdUsers[4]._id,
        cryptoType: "Polygon",
        amount: 200,
        price: 1.5,
        totalValue: 300,
        timestamp: new Date("2024-02-10T17:30:00Z"),
      },
      {
        buyer: createdUsers[0]._id,
        cryptoType: "Binance Coin",
        amount: 5,
        price: 300,
        totalValue: 1500,
        timestamp: new Date("2024-02-12T10:15:00Z"),
      },
      {
        buyer: createdUsers[1]._id,
        cryptoType: "Litecoin",
        amount: 15,
        price: 80,
        totalValue: 1200,
        timestamp: new Date("2024-02-15T14:00:00Z"),
      },
    ];

    const createdTransactions = await Transaction.insertMany(transactions);
    console.log("Created demo transactions:", createdTransactions.length);

    console.log("\n=== DEMO DATA INSERTED SUCCESSFULLY ===");
    console.log("\nDemo Users:");
    createdUsers.forEach((user) => {
      console.log(`- ${user.username} (${user.email})`);
    });

    console.log("\nDemo Transactions:");
    createdTransactions.forEach((tx, index) => {
      console.log(
        `${index + 1}. ${tx.cryptoType}: ${tx.amount} units @ $${tx.price} = $${tx.totalValue}`,
      );
    });

    console.log("\nLogin credentials for testing:");
    console.log("Email: john@example.com, Password: password123");
    console.log("Email: jane@example.com, Password: password123");
    console.log("Email: trader@example.com, Password: password123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

seedDatabase();
