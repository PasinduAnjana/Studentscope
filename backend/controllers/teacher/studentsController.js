const teacherService = require("../../services/teacherService");
const authService = require("../../services/authService");

exports.getAllStudents = async (req, res) => {
  try {
    // Get teacher ID from request (set by auth middleware)
    const teacherId = req.user?.userId;
    console.log("getAllStudents - req.user:", req.user);
    console.log("getAllStudents - teacherId:", teacherId);

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Get students from all teacher's classes
    const students = await teacherService.getStudentsFromTeacherClasses(
      teacherId
    );
    console.log("getAllStudents - returned students count:", students.length);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};
