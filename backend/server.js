const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
console.log("Token routes loaded successfully");

const app = express();
const PORT = 5000;

// CORS
app.use(cors());

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("QueueWise Backend is Running!");
});
app.get("/server-test", (req, res) => {
  res.send("CORRECT BACKEND SERVER");
});

// User routes
app.get("/test-route", (req, res) => {
  res.send("TEST ROUTE WORKS");
});
app.use("/api/users", userRoutes);
app.use("/api/tokens", tokenRoutes);
app.get("/debug-routes", (req, res) => {
  res.json({
    message: "Debug route is working",
    tokenRoutesLoaded: true
  });
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`QueueWise Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB Connection Failed:", error.message);
  });