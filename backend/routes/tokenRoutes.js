
const Counter = require("../models/Counter");

const express = require("express");
const router = express.Router();
const Token = require("../models/Token");
const {
  authenticateToken,
  requireAdmin,
} = require("../middleware/authMiddleware");

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
router.patch(
  "/start/:tokenNumber",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
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
router.patch(
  "/complete/:tokenNumber",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
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
        status: token.status,
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
    const createdByHour = {};
    const completedByHour = {};
    const activityByHour = {};

    // Initialize hourly data
    for (let hour = 0; hour < 24; hour++) {
      createdByHour[hour] = 0;
      completedByHour[hour] = 0;
      activityByHour[hour] = 0;
    }

    const getDay = (date) =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Dhaka",
      }).format(date);

    const getHour = (date) =>
      Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          hourCycle: "h23",
          timeZone: "Asia/Dhaka",
        }).format(date)
      );

    // Analyze token creation and service completion
    tokens.forEach((token) => {
      // Token Created
      if (token.createdAt) {
        const createdDate = new Date(token.createdAt);

        if (!isNaN(createdDate.getTime())) {
          const createdHour = getHour(createdDate);
          const createdDay = getDay(createdDate);

          createdByHour[createdHour]++;
          activityByHour[createdHour]++;

          dayData[createdDay] =
            (dayData[createdDay] || 0) + 1;
        }
      }

      // Service Completed
      if (
        token.status === "Completed" &&
        token.serviceEndTime
      ) {
        const completedDate = new Date(token.serviceEndTime);

        if (!isNaN(completedDate.getTime())) {
          const completedHour = getHour(completedDate);
          const completedDay = getDay(completedDate);

          completedByHour[completedHour]++;
          activityByHour[completedHour]++;

          dayData[completedDay] =
            (dayData[completedDay] || 0) + 1;
        }
      }
    });

    // Find busiest day
    const busiestDay = Object.entries(dayData).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Find busiest hour
    const busiestHour = Object.entries(activityByHour).sort(
      (a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])
    )[0];

    // Find least busy hour with actual historical data
const observedHours = Array.from(
  { length: 13 },
  (_, index) => index + 8
).filter((hour) => activityByHour[hour] > 0);
const formatHour = (hour) => {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:00 ${period}`;
};

const leastBusyHour = observedHours.length > 0
  ? observedHours
      .map((hour) => [hour, activityByHour[hour]])
      .sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]
  : null;

const recommendedVisitTime = leastBusyHour
  ? formatHour(Number(leastBusyHour[0]))
  : "Not enough data";

    // Calculate average completed service duration
    const averageData = await Token.aggregate([
      {
        $match: {
          status: "Completed",
          serviceDuration: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageServiceTime: {
            $avg: "$serviceDuration",
          },
        },
      },
    ]);

    const averageServiceTime =
      averageData.length > 0
        ? Number(
            averageData[0].averageServiceTime.toFixed(2)
          )
        : null;

    // Historical activity pattern
    const hourlyPattern = [9, 11, 13, 15, 17].map((hour) => ({
      hour,
      count: activityByHour[hour] || 0,
      createdCount: createdByHour[hour] || 0,
      completedCount: completedByHour[hour] || 0,
    }));

    res.status(200).json({
      analysisAvailable: true,

      busiestDay: busiestDay[0],
      busiestDayCount: busiestDay[1],

      busiestTime: formatHour(Number(busiestHour[0])),
      busiestTimeCount: busiestHour[1],
      analysisAvailable: Boolean(leastBusyHour),

      leastBusyTime: recommendedVisitTime,
     leastBusyTimeCount: leastBusyHour ? leastBusyHour[1] : null,

      averageServiceTime,

      hourlyPattern,

      recommendedVisitTime,

     message: leastBusyHour
  ? `Based on recorded activity, ${recommendedVisitTime} is the least busy observed hour.`
  : "Not enough historical data to recommend a visiting time.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to analyze busy and free time.",
      error: error.message,
    });
  }
});



// MODULE 3: Get Active Queue for Staff/Admin
router.get(
  "/admin/queue",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
  try {
    const { service } = req.query;

    const filter = {
      status: { $in: ["Waiting", "Serving"] }
    };

    // If a specific service is selected
    if (service) {
      filter.service = service;
    }

    const tokens = await Token.find(filter)
      .sort({ createdAt: 1 });
       res.status(200).json({
      message: "Active queue fetched successfully.",
      totalTokens: tokens.length,
      tokens
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch active queue.",
      error: error.message
    });
  }
});

// MODULE 3: Admin Dashboard Statistics
console.log("ADMIN STATISTICS ROUTE REGISTERED");
router.get(
  "/admin/statistics",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
   console.log("ADMIN STATISTICS API CALLED");
  try {
    // Overall token statistics
    const overallStats = await Token.aggregate([
      {
        $group: {
          _id: null,
          totalTokens: { $sum: 1 },

          waitingTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Waiting"] }, 1, 0]
            }
          },

          servingTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Serving"] }, 1, 0]
            }
          },

          completedTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Service-wise statistics
    const serviceStats = await Token.aggregate([
      {
        $group: {
          _id: "$service",
          totalTokens: { $sum: 1 },

          waiting: {
            $sum: {
              $cond: [{ $eq: ["$status", "Waiting"] }, 1, 0]
            }
          },

          serving: {
            $sum: {
              $cond: [{ $eq: ["$status", "Serving"] }, 1, 0]
            }
          },

          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { totalTokens: -1 }
      }
    ]);

    // Daily statistics for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyStats = await Token.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Dhaka"
            }
          },
          totalTokens: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      message: "Admin statistics fetched successfully.",

      overallStats: overallStats[0] || {
        totalTokens: 0,
        waitingTokens: 0,
        servingTokens: 0,
        completedTokens: 0
      },

      serviceStats,
      dailyStats
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch admin statistics.",
      error: error.message
    });
  }
});

// MODULE 3: Admin Queue History & Service Reports
router.get(
  "/admin/reports",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
  try {
    const { service } = req.query;

    // Optional service filter
    const filter = {};

    if (service) {
      filter.service = service;
    }

    // Overall report statistics
    const overallStats = await Token.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: 1 },

          completedTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0]
            }
          },

          waitingTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Waiting"] }, 1, 0]
            }
          },

          servingTokens: {
            $sum: {
              $cond: [{ $eq: ["$status", "Serving"] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Service-wise reports
    const serviceStats = await Token.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$service",
          totalTokens: { $sum: 1 },

          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0]
            }
          },

          waiting: {
            $sum: {
              $cond: [{ $eq: ["$status", "Waiting"] }, 1, 0]
            }
          },

          serving: {
            $sum: {
              $cond: [{ $eq: ["$status", "Serving"] }, 1, 0]
            }
          },

          averageServiceDuration: {
            $avg: {
              $cond: [
                { $eq: ["$status", "Completed"] },
                "$serviceDuration",
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          service: "$_id",
          totalTokens: 1,
          completed: 1,
          waiting: 1,
          serving: 1,
          averageServiceDuration: {
            $round: [
              { $ifNull: ["$averageServiceDuration", 0] },
              2
            ]
          }
        }
      },
      { $sort: { totalTokens: -1 } }
    ]);

    // Complete token history
    const history = await Token.find(filter)
      .select(
        "tokenNumber service userEmail status serviceStartTime serviceEndTime serviceDuration createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Admin service reports fetched successfully.",

      overallStats: overallStats[0] || {
        totalTokens: 0,
        completedTokens: 0,
        waitingTokens: 0,
        servingTokens: 0
      },

      serviceStats,
      history
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch admin reports.",
      error: error.message
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

   const tokens = await Token.find({ userEmail })
  .select(
    "tokenNumber service status serviceStartTime serviceEndTime serviceDuration createdAt"
  )
  .sort({ createdAt: -1 });

    res.status(200).json({ tokens });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tokens.",
      error: error.message,
    });
  }
});
console.log(
  "STATISTICS ROUTE CHECK:",
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path)
);

module.exports = router;
