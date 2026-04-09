const teacherService = require("../../services/teacherService");

exports.getAllStudents = async (req, res) => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let students;

    if (req.user.is_class_teacher && req.user.class_id) {
       students = await teacherService.getStudentsByClass(req.user.class_id);
    } else {
      students = await teacherService.getStudentsFromTeacherClasses(teacherId);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};
