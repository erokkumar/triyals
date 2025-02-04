const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection setup
const mongoURI = "mongodb+srv://erokkumar876:yXkv0HFzVh4kQz1I@attendance.77tvb.mongodb.net/";

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1); // Exit process on failure
  }
};
connectDB();

/**
 * Function to get current IST time (UTC+5:30) without seconds & milliseconds
 */
function getISTDateWithoutSeconds() {
  const now = new Date();

  // Convert to IST (UTC+5:30)
  const ISTOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const ISTTime = new Date(now.getTime() + ISTOffset);

  // Remove seconds and milliseconds
  ISTTime.setSeconds(0);
  ISTTime.setMilliseconds(0);

  return ISTTime;
}

// Define the schema for attendance
const attendanceSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date },
  date: { type: String, required: true }
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

// 📌 POST route for Login
app.post("/login", async (req, res) => {
  const { employeeName } = req.body;
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Check if the employee already logged in today
    const existingRecord = await Attendance.findOne({ employeeName, date });

    if (existingRecord) {
      return res.status(400).json({ message: "User already logged in today." });
    }

    // Store login time in UTC
    const loginTime = getISTDateWithoutSeconds();
    const newAttendance = new Attendance({ employeeName, date, loginTime });

    await newAttendance.save();

    res.status(200).json({ message: "Login successful.", recordId: newAttendance._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 POST route for Logout
app.post("/logout", async (req, res) => {
  const { employeeName } = req.body;
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Check if employee has logged in today
    const record = await Attendance.findOne({ employeeName, date });

    if (!record) {
      return res.status(400).json({ message: "User has not logged in today." });
    }

    if (record.logoutTime) {
      return res.status(400).json({ message: "User already logged out." });
    }

    // Store logout time in UTC
    record.logoutTime = getISTDateWithoutSeconds();
    await record.save();

    res.status(200).json({ message: "Logout successful." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 GET route to fetch attendance records (Convert UTC → IST)
app.get("/attendance", async (req, res) => {
  try {
    const records = await Attendance.find();

    // Convert stored UTC timestamps to IST before sending response
    const formattedRecords = records.map(record => ({
      ...record._doc,
      loginTime: record.loginTime ? new Date(record.loginTime.getTime() + 5.5 * 60 * 60 * 1000) : null,
      logoutTime: record.logoutTime ? new Date(record.logoutTime.getTime() + 5.5 * 60 * 60 * 1000) : null,
    }));

    res.status(200).json(formattedRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
