
const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
router.get("/test", (req, res) => {
  res.send("TOKEN ROUTE WORKS");
});

// Create a new queue token
router.post("/", async (req, res) => {
  try {
    const { tokenNumber, service, userEmail } = req.body;

    if (!tokenNumber || !service || !userEmail) {
      return res.status(400).json({
        message: "Token number, service, and user email are required.",
      });
    }

    const newToken = new Token({
      tokenNumber,
      service,
      userEmail,
    });

    await newToken.save();

    res.status(201).json({
      message: "Token saved successfully!",
      token: newToken,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This token number already exists. Please generate another.",
      });
    }

    res.status(500).json({
      message: "Failed to save token.",
      error: error.message,
    });
  }
});

// Get tokens for a user

router.get("/position", async (req, res) => {
  try {
    const { tokenNumber } = req.query;

    if (!tokenNumber) {
      return res.status(400).json({
        message: "Please provide a token number.",
      });
    }

    const token = await Token.findOne({ tokenNumber });

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
    }

    if (token.status !== "Waiting") {
      return res.status(200).json({
        tokenNumber: token.tokenNumber,
        service: token.service,
        status: token.status,
        position: null,
        peopleAhead: 0,
      });
    }

    const peopleAhead = await Token.countDocuments({
      service: token.service,
      status: "Waiting",
      createdAt: { $lt: token.createdAt },
    });

    const totalWaiting = await Token.countDocuments({
      service: token.service,
      status: "Waiting",
    });

    res.status(200).json({
      tokenNumber: token.tokenNumber,
      service: token.service,
      status: token.status,
      position: peopleAhead + 1,
      peopleAhead,
      totalWaiting,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to calculate queue position.",
      error: error.message,
    });
  }
});
router.get("/", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        message: "Please provide a user email.",
      });
    }

    const tokens = await Token.find({ userEmail }).sort({ createdAt: -1 });

    res.status(200).json({ tokens });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tokens.",
      error: error.message,
    });
  }
});

module.exports = router;