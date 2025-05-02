const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// const fileUpload = require("express-fileupload");
// const bodyParser = require("body-parser");
const UserModel = require("./models/Users.js");
// const { GoogleGenerativeAI } = require("@google/generative-ai");  // Removed Google Generative AI
// const { GoogleAIFileManager } = require("@google/generative-ai/server"); // Removed Google AI File Manager
const pdfParse = require("pdf-parse");
const fs = require("fs");
// const multer = require("multer");
// const path = require("path");
const { Groq } = require("groq-sdk"); // Added Groq import

const app = express();
require("dotenv").config();

// app.use(fileUpload())

app.use(cors());

app.use(express.json());
// app.use(bodyParser.json({ limit: "5000mb" })); // Handle large base64 payloads
app.use(express.urlencoded({ limit: "5000mb", extended: true })); // Parse URL-encoded data

const mongobd = process.env.MONGO_URL;
mongoose.connect(mongobd)
    .then(console.log("MONGODB connected..."));

const GROQ_API_KEY = process.env.GROQ_API_KEY; // Changed to GROQ API KEY

// Initialize Groq with your API key.
const groq = new Groq({ apiKey: GROQ_API_KEY }); // Initialized Groq Client

// const genAI = new GoogleGenerativeAI(GENAI_API_KEY); // Removed Google Generative AI
// Initialize GoogleAIFileManager with your API_KEY.
// const fileManager = new GoogleAIFileManager(GENAI_API_KEY); // Removed Google AI File Manager

// const model = genAI.getGenerativeModel({ // Removed Google Generative AI
//   // Choose a Gemini model.
//   model: "gemini-1.5-flash",
// });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, "uploads")); // Store in 'server/uploads'
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({
//   storage: storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === "application/pdf") {
//       cb(null, true);
//     } else {
//       cb(new Error("Only PDF files are allowed!"), false);
//     }
//   },
// });

// Helper: Convert file to generative part for Google API
// function cleanAndValidatePDF(fileBuffer) {
//   // Use pdf-parse to extract text from the PDF buffer
//   return pdfParse(fileBuffer)
//     .then((data) => {
//       return data.text;  // Extracted text from PDF
//     })
//     .catch((error) => {
//       throw new Error("Error parsing PDF file.");
//     });
// }

// // Analyze PDF using Google Generative AI
// async function analyzePDF(pdfBuffer, dictOfVars) {
//   const dictOfVarsStr = JSON.stringify(dictOfVars);

//   const prompt = `Give a summary of the pdf.` // Your existing prompt, which is based on text, not images

//   try {
//     // Clean and validate the PDF by extracting text
//     const pdfText = await cleanAndValidatePDF(pdfBuffer);

//     // Call the Generative AI API
//     const result = await model.generateContent([prompt, pdfText]);

//     // Log the full response for debugging
//     console.log("Full API Response:", JSON.stringify(result, null, 2));

//     // Extract text from candidates
//     const candidates = result.response?.candidates || [];
//     console.log("Candidates Array:", JSON.stringify(candidates, null, 2));

//     const responseText = candidates[0]?.content?.parts[0]?.text || "[]";
//     console.log("Extracted Text:", responseText);

//     // Clean up JSON (strip markdown code block syntax if present)
//     const cleanedText = responseText.replace(/```json|```/g, "").trim();
//     console.log("Cleaned Text:", cleanedText);

//     // Safely parse the response
//     let parsedResponse;
//     try {
//       parsedResponse = JSON.parse(cleanedText);
//     } catch (jsonError) {
//       console.error("JSON Parsing Error:", jsonError.message);
//       throw new Error("API returned invalid JSON format.");
//     }

//     if (!Array.isArray(parsedResponse)) {
//       throw new Error("Unexpected response format from Generative AI.");
//     }

//     return parsedResponse;
//   } catch (error) {
//     console.error("Error in analyzePDF function:", error.message);
//     throw new Error(
//       "Failed to analyze PDF. Check API response and credentials."
//     );
//   }
// }

app.get("/", (req, res) => {
  res.json("This is Backend.");
});

const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing

app.post("/createUser", async (request, response) => {
  
  try {
    const { username, email, password } = request.body;
    // Check if username or email already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }],
    });
    if (existingUser) {
      return response
        .status(400)
        .json({ message: "Email already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(username, email, hashedPassword)
    // Create the user with hashed password
    UserModel.create({
      username: username,
      email: email,
      password: hashedPassword,
    }).then((gamers) => {
      console.log(gamers);
      response.status(200).json(gamers)
      
    });
  } catch (err) {
    console.error(err);
    response.status(500).json({ message: "Server error", error: err });
  }
});

app.post("/loginUser", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.status(200).json(user); // Send user data on successful login
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getUser/:id", (req, res) => {
  const { id } = req.params;

  // Check if the provided ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  UserModel.findById(id)
    .then((gamers) => {
      if (!gamers) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(gamers);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err });
    });
});

app.post("/profile/:id", async (req, res) => {
  try {
    const {
      mobileNumber,
      country,
      schoolOrUniversity,
      schoolDetails,
      universityDetails,
    } = req.body;

    const { id } = req.params; // Replace with actual user ID logic

    // Find the user and update the profile
    const user = await UserModel.findById(id);
    console.log(user)
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update the user's profile fields
    user.mobileNumber = mobileNumber;
    user.country = country;
    user.schoolOrUniversity = schoolOrUniversity;

    if (schoolOrUniversity === "school") {
      user.schoolDetails = schoolDetails;
    } else if (schoolOrUniversity === "university") {
      user.universityDetails = universityDetails;
    }

    await user.save();

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating profile" });
  }
});

app.post("/profileUpdate/:id", async (req, res) => {
  try {
    const {
      mobileNumber,
      country,
      schoolOrUniversity,
      schoolDetails,
      universityDetails,
    } = req.body;

    // Extract the user ID from the request parameters
    const { id } = req.params;

    // Find the user by their ID
    const user = await UserModel.findById(id);

    // Check if the user exists
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update the user's profile details
    user.mobileNumber = mobileNumber || user.mobileNumber;
    user.country = country || user.country;
    user.schoolOrUniversity = schoolOrUniversity || user.schoolOrUniversity;

    // Conditionally update school or university details based on the selected value
    if (schoolOrUniversity === "school") {
      user.schoolDetails = schoolDetails || user.schoolDetails;
    } else if (schoolOrUniversity === "university") {
      user.universityDetails = universityDetails || user.universityDetails;
    }

    // Save the updated user profile
    await user.save();

    // Respond with the updated user data
    return res.status(201).json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating profile" });
  }
});

// app.post("/query", async (req, res) => {
//   try {
//     const { examDate, subjects, base64PDF } = req.body;
//     console.log("Exam Date:", examDate);
//     console.log("Subjects:", subjects);

//     // Validate input
//     if (!examDate || !Array.isArray(subjects) || subjects.length === 0) {
//       return res.status(400).json({ message: "Invalid data provided" });
//     }

//     if (!base64PDF) {
//       return res.status(400).json({ message: "No PDF file provided" });
//     }

//     // Convert the base64 PDF to a Buffer
//     const pdfBuffer = Buffer.from(base64PDF, "base64");

//     // Analyze the PDF
//     const result = await analyzePDF(pdfBuffer, subjects);

//     // Log or save the data (if required)
//     console.log("Exam Date:", examDate);
//     console.log("Subjects:", subjects);
//     if (result) {
//       console.log("File Summary:", result);
//     }

//     // Respond with the result
//     return res.status(200).json({
//       message: "Query processed successfully",
//       data: {
//         examDate,
//         subjects,
//         fileSummary: result, // Include the result from analyzePDF
//       },
//     });
//   } catch (error) {
//     console.log("Error processing query:", error);
//     return res.status(500).json({ message: "Error processing query", error });
//   }
// });

function calculateDaysUntilExam(examDateStr) {
  // Parse the exam date from a string (e.g., "2024-12-25")
  const currentDate = new Date();

  const examDate = new Date(examDateStr);

  console.log(new Date());
  // Get the current date

  // Calculate the time difference in milliseconds
  const timeDifference = examDate - currentDate;

  // Convert milliseconds to days (1 day = 24 * 60 * 60 * 1000 ms)
  const daysUntilExam = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

  // Return the result
  return daysUntilExam > 0 ? daysUntilExam : 0; // Ensure non-negative value
}

const datevalue = calculateDaysUntilExam("2025-01-04");
// console.log(datevalue);

app.post("/query/:id", async (req, res) => {
  console.log(req.body)
  const { examDate, subjects } = req.body;
  const { id } = req.params;
  // const pdfFile = req.file;
  // console.log("Uploaded PDF:", pdfFile);
  console.log("Subjects type:", typeof subjects);
  const pdfFile = false

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const country = user.country;
    const schoolOrUniversity = user.schoolOrUniversity;
    const schoolBoard = user.schoolDetails?.schoolBoard;
    const standard = user.schoolDetails?.standard;

    const universityName = user.universityDetails?.universityName;
    const course = user.universityDetails?.course;
    const branch = user.universityDetails?.branch;
    const year = user.universityDetails?.year;
    const semester = user.universityDetails?.semester;

    const daysLeft = calculateDaysUntilExam(examDate) - 1;

    let prompt = "";
    // Determine the appropriate prompt based on whether a PDF is uploaded
    if (pdfFile) {
      try {
        // Extract text from the uploaded PDF
        const dataBuffer = fs.readFileSync(pdfFile.path);
        const pdfData = await pdfParse(dataBuffer);
        const extractedText = pdfData.text;

        console.log("Extracted PDF Text:", extractedText);

        // Build prompt for school/university based on extracted text
        if (schoolOrUniversity === "school") {
          prompt = `DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT. You are an intelligent and helpful assistant designed to create effective and personalized study timetables for students preparing for their exams. A user will provide the remaining number of days they have before their exam and the syllabus they need to cover. Your task is to create a balanced, realistic, and efficient study timetable that helps the user cover their syllabus thoroughly while considering revision and rest time.

          The user is a ${schoolOrUniversity} student ${standard} standard from ${schoolBoard} Board.
          They have ${daysLeft} days left before their exam,starting from ${new Date()} and their syllabus includes:
          ${extractedText}

          Timetable Requirements:
          Divide the syllabus evenly across the remaining days, prioritizing difficult or lengthy topics first.
          Allocate sufficient time for revision during the last 1 or 2 days.
          Include small breaks and avoid overloading the user to maintain productivity and focus.
          Suggest study strategies like summarizing notes, solving past papers, or reviewing key formulas for each subject.
          Ensure that the timetable is flexible and customizable if the user wishes to adjust it.
          Finally, present the timetable in a clear, easy-to-follow format.

          Return the result in the following format: 
          [{"dateofthetask": "18-12-2024", "starttimeforslotstart": "9:00", "endtimeforslotend": "11:00", "taskname": "newtons laws of motion"}, 
           {"dateofthetask": "18-12-2024", "starttimeforslotstart": "11:00", "endtimeforslotend": "13:00", "taskname": "differentiation"}]

          DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT.

        `;
        } else {
          prompt = ` DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT. You are an intelligent and helpful assistant designed to create effective and personalized study timetables for students preparing for their exams. A user will provide the remaining number of days they have before their exam and the syllabus they need to cover. Your task is to create a balanced, realistic, and efficient study timetable that helps the user cover their syllabus thoroughly while considering revision and rest time.

          The user is a ${schoolOrUniversity} student ${course} in ${branch}, ${year} year, ${semester} semester student from ${universityName} University.
          They have ${daysLeft} days left before their exam, starting from ${new Date()} and their syllabus includes:
          ${extractedText}

          Timetable Requirements:
          Divide the syllabus evenly across the remaining days, prioritizing difficult or lengthy topics first.
          Allocate sufficient time for revision during the last 1 or 2 days.
          Include small breaks and avoid overloading the user to maintain productivity and focus.
          Suggest study strategies like summarizing notes, solving past papers, or reviewing key formulas for each subject.
          Ensure that the timetable is flexible and customizable if the user wishes to adjust it.
          Finally, present the timetable in a clear, easy-to-follow format.

          Return the result in the following format: 
          [{"dateofthetask": "18-12-2024", "starttimeforslotstart": "9:00", "endtimeforslotend": "11:00", "taskname": "newtons laws of motion"}, 
           {"dateofthetask": "18-12-2024", "starttimeforslotstart": "11:00", "endtimeforslotend": "13:00", "taskname": "differentiation"}]

          DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT.

        `;
        }
      } catch (err) {
        console.error("Error processing PDF:", err);
        return res.status(500).json({ error: "Failed to extract PDF content" });
      }
    } else {
      // Fallback if no PDF is uploaded
      if (schoolOrUniversity === "school") {
        prompt = `DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT. You are an intelligent and helpful assistant designed to create effective and personalized study timetables for students preparing for their exams. A user will provide the remaining number of days they have before their exam and the syllabus they need to cover. Your task is to create a balanced, realistic, and efficient study timetable that helps the user cover their syllabus thoroughly while considering revision and rest time.

          The user is a ${schoolOrUniversity} student ${standard} standard from ${schoolBoard} Board.
          They have ${daysLeft} days left before their exam,starting from ${new Date()} and their syllabus includes:
          ${subjects}

          Timetable Requirements:
          Divide the syllabus evenly across the remaining days, prioritizing difficult or lengthy topics first.
          Allocate sufficient time for revision during the last 1 or 2 days.
          Include small breaks and avoid overloading the user to maintain productivity and focus.
          Suggest study strategies like summarizing notes, solving past papers, or reviewing key formulas for each subject.
          Ensure that the timetable is flexible and customizable if the user wishes to adjust it.
          Finally, present the timetable in a clear, easy-to-follow format.

          Return the result in the following format: 
          [{"dateofthetask": "18-12-2024", "starttimeforslotstart": "9:00", "endtimeforslotend": "11:00", "taskname": "newtons laws of motion"}, 
           {"dateofthetask": "18-12-2024", "starttimeforslotstart": "11:00", "endtimeforslotend": "13:00", "taskname": "differentiation"}]

          DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT.

        `;
      } else {
        prompt = `DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT. You are an intelligent and helpful assistant designed to create effective and personalized study timetables for students preparing for their exams. A user will provide the remaining number of days they have before their exam and the syllabus they need to cover. Your task is to create a balanced, realistic, and efficient study timetable that helps the user cover their syllabus thoroughly while considering revision and rest time.

          The user is a ${schoolOrUniversity} student ${course} in ${branch}, ${year} year, ${semester} semester student from ${universityName} University.
          They have ${daysLeft} days left before their exam, starting from ${new Date()} and their syllabus includes:
          ${subjects}

          Timetable Requirements:
          Divide the syllabus evenly across the remaining days, prioritizing difficult or lengthy topics first.
          Allocate sufficient time for revision during the last 1 or 2 days.
          Include small breaks and avoid overloading the user to maintain productivity and focus.
          Suggest study strategies like summarizing notes, solving past papers, or reviewing key formulas for each subject.
          Ensure that the timetable is flexible and customizable if the user wishes to adjust it.
          Finally, present the timetable in a clear, easy-to-follow format.

          Return the result in the following format: 
          [{"dateofthetask": "18-12-2024", "starttimeforslotstart": "9:00", "endtimeforslotend": "11:00", "taskname": "newtons laws of motion"}, 
           {"dateofthetask": "18-12-2024", "starttimeforslotstart": "11:00", "endtimeforslotend": "13:00", "taskname": "differentiation"}]

          DO NOT USE BACKTICKS OR MARKDOWN FORMATTING and DON NOT RETURN ANYTHING WITHOUT THIS FORMAT. 
          PROPERLY QUOTE THE KEYS AND VALUES IN the DICTIONARY FOR EASIER PARSING WITH JavaScript's JSON.parse.
          STRICTLY FOLLOW THE FORMAT TO RETURN THE RESULT.

        `;
      }
    }

    // Call Groq model with the generated prompt
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", // Specifying the model here
      temperature: 0.7,
      // topP: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false,
      // maxTokens: 1024, // Consider adding a token limit
    });

    if (
      chatCompletion &&
      chatCompletion.choices &&
      chatCompletion.choices.length > 0
    ) {
      const responseContent = chatCompletion.choices[0].message.content;
      console.log(responseContent);
      return res
        .status(200)
        .json(responseContent.replace(/```json|```/g, "").trim());
    } else {
      console.error("Unexpected response structure from Groq:", chatCompletion);
      return res
        .status(500)
        .json({ error: "Failed to get valid response from Groq." });
    }
  } catch (err) {
    console.error("Error processing query:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/save/:id", async (req, res) => {
  try {
    let { taskSchedule } = req.body; // Extract taskSchedule from the request body
    let { subjects } = req.body;
    const { id } = req.params; // Extract user ID from the route parameters

    // Check if taskSchedule is in string format and try to parse it into an array of objects
    if (typeof taskSchedule === "string") {
      try {
        taskSchedule = JSON.parse(taskSchedule); // Parse the string into an array of objects
      } catch (err) {
        return res
          .status(400)
          .json({ error: "Invalid taskSchedule format. Failed to parse." });
      }
    }

    // Validate taskSchedule format
    if (!Array.isArray(taskSchedule)) {
      return res.status(400).json({
        error: "Invalid taskSchedule format. Expected an array of objects.",
      });
    }

    // Validate individual task schedule objects
    for (const task of taskSchedule) {
      if (typeof task !== "object" || !task.dateofthetask || !task.taskname) {
        return res.status(400).json({
          error:
            "Each task must be an object with 'dateofthetask' and 'taskname'.",
        });
      }
    }

    // Find the user by ID
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the taskSchedule field in the user document
    user.taskSchedule = taskSchedule;
    user.subjects = subjects;

    // Save the updated user document
    await user.save();

    // Return the updated user as the response
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error saving task schedule:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from the route parameters

    // Find the user by ID
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the taskSchedule and subjects fields from the user document
    user.taskSchedule = undefined; // Remove taskSchedule field
    user.subjects = undefined; // Remove subjects field

    // Save the updated user document
    await user.save();

    // Return the updated user as the response
    return res.status(200).json({
      message: "TaskSchedule and Subjects have been deleted successfully.",
      user,
    });
  } catch (error) {
    console.error("Error deleting task schedule:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/get/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await UserModel.findById(id); // Await the result from findById
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(201).json(user); // Return the user data
  } catch (err) {
    console.error("Error:", err);
    return res.status(400).json({ error: err.message });
  }
});

app.put("/update-task-status/:id", async (req, res) => {
  const { id } = req.params; // The user ID
  // const{tId} = req.params;
  const { taskId, status } = req.body; // Task ID and new status from the request body

  try {
    const user = await UserModel.findById(id); // Fetch the user by ID
    console.log(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Locate the task to update within the user's taskSchedule array
    const task = user.taskSchedule.find((t) => t.taskId === taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update the task's status
    task.status = status;

    // Save the user document with the updated task
    await user.save();

    res.status(200).json({ message: "Task status updated successfully" });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(5000, () => {
  console.log("Server is running...", 5000);
});
