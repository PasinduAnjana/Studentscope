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

    let students;

    // Logic change: If class teacher, only return students from their assigned class
    if (req.user.is_class_teacher && req.user.class_id) {
       students = await teacherService.getStudentsByClass(req.user.class_id);
    } else {
      // Get students from all teacher's classes (subject teacher view)
      students = await teacherService.getStudentsFromTeacherClasses(teacherId);
    }

    console.log("getAllStudents - returned students count:", students.length);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};
