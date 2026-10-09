const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: String,
      required: true,
      unique: true,
    },
    service: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Waiting",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Token", tokenSchema);