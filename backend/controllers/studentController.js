const fs = require("fs");
const path = require("path");

// exports.getAllStudents = (req, res) => {
//   const dataPath = path.join(__dirname, "../data/students.json");
//   const students = JSON.parse(fs.readFileSync(dataPath, "utf8"));

//   res.writeHead(200, { "Content-Type": "application/json" });
//   res.end(JSON.stringify(students));
// };

const pool = require("../db");

exports.getAllStudents = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.rows));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};
