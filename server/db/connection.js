import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

let memoryServer = null;

const ensureDefaultAdmin = async () => {
  const isProd = process.env.NODE_ENV === "production";
  const adminEmail = process.env.ADMIN_EMAIL || (isProd ? "" : "admin@gmail.com");
  const adminPassword = process.env.ADMIN_PASSWORD || (isProd ? "" : "admin");

  if (!adminEmail || !adminPassword) return;

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) return;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: "Admin User",
    email: adminEmail,
    password: hashedPassword,
    phone: "9876543210",
    role: "Admin",
    status: "Active",
  });
  console.log(`Seeded default admin (${adminEmail})`);
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const isProd = process.env.NODE_ENV === "production";

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: isProd ? 5000 : 2000 });
      console.log("Connected to MongoDB");
      await ensureDefaultAdmin();
      return;
    } catch (error) {
      if (isProd) {
        console.error("Failed to connect to MONGO_URI in production:", error.message);
        process.exit(1);
      }
      console.warn(
        `Could not connect to MONGO_URI (${error.message}). Falling back to local MongoMemoryServer...`
      );
    }
  } else if (isProd) {
    console.error("MONGO_URI is required in production");
    process.exit(1);
  }

  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const dbPath = path.resolve(process.cwd(), ".mongo-data");
    fs.mkdirSync(dbPath, { recursive: true });

    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath,
        storageEngine: "wiredTiger",
      },
    });

    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log("Connected to local MongoMemoryServer at", dbPath);
    await ensureDefaultAdmin();
  } catch (error) {
    console.error("Error connecting to database:", error.message);
    process.exit(1);
  }
};

export default connectDB;