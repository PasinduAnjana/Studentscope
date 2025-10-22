const studentController = require("../controllers/student/studentController");
const { protect } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  // Dashboard routes
  if (req.method === "GET" && req.url === "/api/student/timetable/today") {
    return protect("student")(req, res, () =>
      studentController.getTodaysTimetable(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/timetable/week") {
    return protect("student")(req, res, () =>
      studentController.getWeeklyTimetable(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url === "/api/student/attendance/percentage"
  ) {
    return protect("student")(req, res, () =>
      studentController.getAttendancePercentage(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url === "/api/student/attendance/present-days"
  ) {
    return protect("student")(req, res, () =>
      studentController.getPresentDays(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/marks/average") {
    return protect("student")(req, res, () =>
      studentController.getAverageMarks(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/achievements") {
    return protect("student")(req, res, () =>
      studentController.getAchievements(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/announcements") {
    return protect("student")(req, res, () =>
      studentController.getAnnouncements(req, res)
    );
  }

  // Profile route
  if (req.method === "GET" && req.url === "/api/student/profile") {
    return protect("student")(req, res, () =>
      studentController.getProfile(req, res)
    );
  }

  // Change password route
  if (req.method === "PUT" && req.url === "/api/student/change-password") {
    return protect("student")(req, res, () =>
      studentController.changePassword(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
