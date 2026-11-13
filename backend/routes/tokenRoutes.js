
const Counter = require("../models/Counter");

const express = require("express");
const router = express.Router();
const Token = require("../models/Token");

// Test route
router.get("/test", (req, res) => {
  res.send("TOKEN ROUTE WORKS");
});


const servicePrefixes = {
  "Medical Consultation": "MED",
  "Diagnostic Test": "DIA",
  "Pharmacy": "PHA",
  "Pharmacy Service": "PHA",
  "Billing": "BIL",
  "Billing / Payment": "BIL",
};

router.post("/", async (req, res) => {
  try {
    const { service, userEmail } = req.body;

    if (!service || !userEmail) {
      return res.status(400).json({
        message: "Service and user email are required.",
      });
    }

    const prefix = servicePrefixes[service];

    if (!prefix) {
      return res.status(400).json({
        message: "Invalid service type.",
      });
    }

    // Get current date in Bangladesh timezone
    const dateParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).formatToParts(new Date());

    const dateValues = {};

    dateParts.forEach((part) => {
      dateValues[part.type] = part.value;
    });

    const dateCode =
      dateValues.day + dateValues.month + dateValues.year;

    // Generate a separate serial for each service and date
    const counterKey = `${dateCode}-${prefix}`;

    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { sequence: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const serial = String(counter.sequence).padStart(3, "0");

    const tokenNumber = `QW-${prefix}-${dateCode}-${serial}`;

    const newToken = new Token({
      tokenNumber,
      service,
      userEmail,
    });

    await newToken.save();

    res.status(201).json({
      message: "QueueWise Smart Digital Pass created successfully!",
      token: newToken,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate token.",
      error: error.message,
    });
  }
});

  


// MODULE 1: Queue Position Tracking
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

// MODULE 2: Start Service
router.patch("/start/:tokenNumber", async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const token = await Token.findOne({ tokenNumber });

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
    }

    if (token.status !== "Waiting") {
      return res.status(400).json({
        message: "Only waiting tokens can start service.",
      });
    }

    const updatedToken = await Token.findOneAndUpdate(
      {
        tokenNumber,
        status: "Waiting",
      },
      {
        $set: {
          status: "Serving",
          serviceStartTime: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedToken) {
      return res.status(409).json({
        message: "Token status changed. Please try again.",
      });
    }

    res.status(200).json({
      message: "Service started successfully!",
      token: updatedToken,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to start service.",
      error: error.message,
    });
  }
});

// MODULE 2: Complete Service & Calculate Duration
router.patch("/complete/:tokenNumber", async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const token = await Token.findOne({
      tokenNumber,
      status: "Serving",
    });

    if (!token) {
      return res.status(400).json({
        message: "Token not found or service has not started.",
      });
    }

    if (!token.serviceStartTime) {
      return res.status(400).json({
        message: "Service start time is missing.",
      });
    }

    const serviceEndTime = new Date();

    const durationInMinutes =
      (serviceEndTime - new Date(token.serviceStartTime)) / 60000;

    const serviceDuration =
      Math.round(durationInMinutes * 100) / 100;

    const updatedToken = await Token.findOneAndUpdate(
      {
        tokenNumber,
        status: "Serving",
        serviceStartTime: token.serviceStartTime,
      },
      {
        $set: {
          status: "Completed",
          serviceEndTime,
          serviceDuration,
        },
      },
      { new: true }
    );

    if (!updatedToken) {
      return res.status(409).json({
        message: "Token status changed. Please try again.",
      });
    }

    res.status(200).json({
      message: "Service completed successfully!",
      token: updatedToken,
      serviceDuration,
      unit: "minutes",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to complete service.",
      error: error.message,
    });
  }
});

// MODULE 2: Calculate Average Service Time
router.get("/average-time", async (req, res) => {
  try {
    const averageTimes = await Token.aggregate([
      {
        $match: {
          status: "Completed",
          serviceDuration: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$service",
          averageServiceTime: {
            $avg: "$serviceDuration",
          },
          completedServices: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          service: "$_id",
          averageServiceTime: {
            $round: ["$averageServiceTime", 2],
          },
          completedServices: 1,
        },
      },
    ]);

    res.status(200).json({
      message: "Average service times calculated successfully.",
      unit: "minutes",
      averageTimes,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to calculate average service time.",
      error: error.message,
    });
  }
});
router.get("/estimate-test", (req, res) => {
  res.send("ESTIMATE ROUTE IS WORKING");
});

// MODULE 2: Dynamic Waiting Time & Expected Serving Time
console.log("ESTIMATE ROUTE REGISTERED");
router.get("/estimate", async (req, res) => {
  try {
    const { tokenNumber } = req.query;

    if (!tokenNumber) {
      return res.status(400).json({
        message: "Please provide a token number.",
      });
    }

    // Find the user's token
    const token = await Token.findOne({ tokenNumber });

    if (!token) {
      return res.status(404).json({
        message: "Token not found.",
      });
    }

    // Calculate average service time for this service
    const averageData = await Token.aggregate([
      {
        $match: {
          service: token.service,
          status: "Completed",
          serviceDuration: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageServiceTime: { $avg: "$serviceDuration" },
          completedServices: { $sum: 1 },
        },
      },
    ]);

    if (averageData.length === 0) {
      return res.status(200).json({
        message: "Not enough completed service data.",
        tokenNumber,
        service: token.service,
        estimateAvailable: false,
      });
    }

    const averageServiceTime =
      averageData[0].averageServiceTime;

    // If service is already completed
    if (token.status === "Completed") {
      return res.status(200).json({
        message: "This service is already completed.",
        tokenNumber,
        status: token.status,
        serviceDuration: token.serviceDuration,
        estimateAvailable: false,
      });
    }

    // If the user's service is already running
    if (token.status === "Serving") {
      const elapsedMinutes =
        (Date.now() - new Date(token.serviceStartTime).getTime()) /
        60000;

      const remainingTime = Math.max(
        averageServiceTime - elapsedMinutes,
        0
      );

      return res.status(200).json({
        message: "Your service is currently running.",
        tokenNumber,
        status: token.status,
        averageServiceTime: Number(averageServiceTime.toFixed(2)),
        estimatedRemainingTime: Number(remainingTime.toFixed(2)),
        unit: "minutes",
      });
    }

    // Count waiting tokens ahead of the user's token
    const peopleAhead = await Token.countDocuments({
      service: token.service,
      status: "Waiting",
      createdAt: { $lt: token.createdAt },
    });

    // Find currently serving tokens of the same service
    const servingTokens = await Token.find({
      service: token.service,
      status: "Serving",
    });

    // Calculate the remaining time of current service(s)
    let currentServingRemaining = 0;

    for (const servingToken of servingTokens) {
      if (servingToken.serviceStartTime) {
        const elapsed =
          (Date.now() -
            new Date(servingToken.serviceStartTime).getTime()) /
          60000;

        currentServingRemaining += Math.max(
          averageServiceTime - elapsed,
          0
        );
      }
    }

    // Calculate total estimated waiting time
    const estimatedWaitingTime =
      currentServingRemaining +
      peopleAhead * averageServiceTime;

    // Calculate expected serving time
    const expectedServingTime = new Date(
      Date.now() + estimatedWaitingTime * 60000
    );

    res.status(200).json({
      message: "Waiting time estimated successfully.",
      tokenNumber,
      service: token.service,
      status: token.status,
      peopleAhead,
      averageServiceTime: Number(averageServiceTime.toFixed(2)),
      estimatedWaitingTime: Number(
        estimatedWaitingTime.toFixed(2)
      ),
      expectedServingTime,
      unit: "minutes",
      estimateAvailable: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to estimate waiting time.",
      error: error.message,
    });
  }
});
// Busy / Free Day & Time Analysis

// Busy / Free Day & Time Analysis
router.get("/visit-analysis", async (req, res) => {
  try {
    const tokens = await Token.find({
      status: { $in: ["Waiting", "Serving", "Completed"] },
    });

    if (tokens.length === 0) {
      return res.status(200).json({
        message: "Not enough queue data for analysis.",
        analysisAvailable: false,
      });
    }

    const dayData = {};
    const hourData = {};

    tokens.forEach((token) => {
      const date = new Date(token.createdAt);

      // Bangladesh timezone
      const day = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Dhaka",
      }).format(date);

      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          hourCycle: "h23",
          timeZone: "Asia/Dhaka",
        }).format(date)
      );

      dayData[day] = (dayData[day] || 0) + 1;
      hourData[hour] = (hourData[hour] || 0) + 1;
    });

    // Find busiest day
    const busiestDay = Object.entries(dayData).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Find busiest hour
    const busiestHour = Object.entries(hourData).sort(
      (a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])
    )[0];

    // Find least busy hour from observed hours
    // Find the least busy hour within reasonable visiting hours (8 AM - 8 PM)
const reasonableHours = Object.entries(hourData).filter(
  ([hour]) => Number(hour) >= 8 && Number(hour) <= 20
);

const leastBusyHour = reasonableHours.sort(
  (a, b) => a[1] - b[1] || Number(a[0]) - Number(b[0])
)[0];

    const formatHour = (hour) => {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    };

    const recommendedVisitTime = formatHour(
      Number(leastBusyHour[0])
    );

    res.status(200).json({
      analysisAvailable: true,

      busiestDay: busiestDay[0],
      busiestDayCount: busiestDay[1],

      busiestTime: formatHour(Number(busiestHour[0])),
      busiestTimeCount: busiestHour[1],

      leastBusyTime: recommendedVisitTime,
      leastBusyTimeCount: leastBusyHour[1],

      recommendedVisitTime,

      message: `Based on historical queue data, ${recommendedVisitTime} has the lowest recorded queue activity among the observed hours.`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to analyze busy and free time.",
      error: error.message,
    });
  }
});



// Get tokens for a user
router.get("/", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        message: "Please provide a user email.",
      });
    }

    const tokens = await Token.find({ userEmail }).sort({
      createdAt: -1,
    });

    res.status(200).json({ tokens });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tokens.",
      error: error.message,
    });
  }
});

module.exports = router;
