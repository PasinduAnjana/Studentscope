const teacherService = require("../../services/teacherService");

exports.getAllExams = async (req, res) => {
  try {
    const exams = await teacherService.getAllExams();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(exams));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch exams" }));
  }
};