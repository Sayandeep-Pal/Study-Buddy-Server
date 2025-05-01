const mongoose = require("mongoose");

// Define the User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Simple email regex validation
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // New fields for profile completion
  mobileNumber: {
    type: String,
  },
  country: {
    type: String,
  },
  schoolOrUniversity: {
    type: String,
    enum: ["school", "university"], // Limiting to either school or university
  },
  schoolDetails: {
    schoolBoard: { type: String },
    schoolName: { type: String },
    standard: { type: String },
  },
  universityDetails: {
    universityName: { type: String },
    collegeName: { type: String },
    course: { type: String },
    branch: { type: String },
    year: { type: String },
    semester: { type: String },
  },
  taskSchedule: {
  type: [
    {
      _id: false, // Prevent Mongoose from auto-creating an _id for subdocuments if you use taskId
      taskId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString(), // Generate a unique task ID
      },
      dateofthetask: { type: String, required: true },
      starttimeforslotstart: { type: String, required: true },
      endtimeforslotend: { type: String, required: true },
      taskname: { type: String, required: true },
      status: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending", // Default status
      },
    },
  ],
  default: [],
},
  subjects: {
    type: [
      {
        name: { type: String, default: "" },
        syllabus: { type: String, default: "" }, // Optional syllabus field
      },
    ],
    default: [],
  },
  // taskSchedule: {type: String},
});

// Create the User model
const UserModel = mongoose.model("StudyBuddy-AI", UserSchema);

module.exports = UserModel;
