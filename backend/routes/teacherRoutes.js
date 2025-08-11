const studentController = require("../controllers/teacher/studentsController");
const { protect } = require("../middleware/authMiddleware");
module.exports = (req, res) => {
  if (req.method === "GET" && req.url === "/api/teacher/students") {
    return protect("teacher")(req, res, () =>
      studentController.getAllStudents(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/timetable/today/")
  ) {
    const teacherId = req.url.split("/").pop(); // Get last part of URL
    return protect("teacher")(req, res, () =>
      studentController.getTeacherTodayTimetable(
        { ...req, params: { teacherId } },
        res
      )
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
