
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD is missing in .env");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      // Promote existing account without replacing its password
      admin.role = "admin";

      // Upgrade old plain-text password if necessary
      if (!admin.password.startsWith("$2")) {
        admin.password = await bcrypt.hash(admin.password, 12);
      }

      await admin.save();

      console.log("Existing account promoted to Admin.");
    } else {
      if (adminPassword.length < 6) {
        throw new Error("Admin password must be at least 6 characters.");
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      admin = new User({
        name: "QueueWise Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });

      await admin.save();

      console.log("New Admin account created successfully.");
    }

    console.log("Admin Email:", admin.email);
    console.log("Admin Role:", admin.role);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
