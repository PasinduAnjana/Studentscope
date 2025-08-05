const teacherService = require("../../services/teacherService");

exports.getAllStudents = async (req, res) => {
  try {
    const students = await teacherService.getStudents();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};
