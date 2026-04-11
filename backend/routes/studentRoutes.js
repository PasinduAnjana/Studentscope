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

  if (req.method === "GET" && (req.url === "/api/student/marks/average" || req.url.startsWith("/api/student/marks/average?"))) {
    return protect("student")(req, res, () =>
      studentController.getAverageMarks(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/achievements") {
    return protect("student")(req, res, () =>
      studentController.getAchievements(req, res)
    );
  }

  if (req.method === "GET" && (req.url === "/api/student/marks/rank" || req.url.startsWith("/api/student/marks/rank?"))) {
    return protect("student")(req, res, () =>
      studentController.getClassRank(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/marks/term-tests") {
    return protect("student")(req, res, () =>
      studentController.getTermTests(req, res)
    );
  }

  if (req.method === "GET" && (req.url === "/api/student/marks/term-test" || req.url.startsWith("/api/student/marks/term-test?"))) {
    return protect("student")(req, res, () =>
      studentController.getTermTestMarks(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/marks/trend") {
    return protect("student")(req, res, () =>
      studentController.getTermTestTrend(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/announcements") {
    return protect("student")(req, res, () =>
      studentController.getAnnouncements(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/student/events") {
    return protect("student")(req, res, () =>
      studentController.getEvents(req, res)
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

  // Certificate routes
  if (req.method === "GET" && req.url === "/api/student/certificates") {
    return protect("student")(req, res, () =>
      studentController.getCertificates(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/student/certificates") {
    return protect("student")(req, res, () =>
      studentController.createCertificate(req, res)
    );
  }

  if (req.method === "DELETE" && req.url.startsWith("/api/student/certificates")) {
    return protect("student")(req, res, () =>
      studentController.deleteCertificate(req, res)
    );
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
};
