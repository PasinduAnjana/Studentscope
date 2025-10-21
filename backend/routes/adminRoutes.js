const adminController = require("../controllers/admin/dashboardController");
const attendanceController = require("../controllers/admin/attendanceController");
const { protect } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  if (req.method === "GET" && req.url === "/api/admin/dashboard") {
    return protect("admin")(req, res, () =>
      adminController.getDashboard(req, res)
    );
  }

  // Attendance routes
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/attendance/stats")
  ) {
    return protect("admin")(req, res, () =>
      attendanceController.getAttendanceStats(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/attendance/records")
  ) {
    return protect("admin")(req, res, () =>
      attendanceController.getAttendanceRecords(req, res)
    );
  }

  if (req.method === "PUT" && req.url.startsWith("/api/admin/attendance")) {
    return protect("admin")(req, res, () =>
      attendanceController.updateAttendanceRecord(req, res)
    );
  }

  if (req.method === "DELETE" && req.url.startsWith("/api/admin/attendance")) {
    return protect("admin")(req, res, () =>
      attendanceController.deleteAttendanceRecord(req, res)
    );
  }

  // Students and classes routes for attendance page
  if (req.method === "GET" && req.url === "/api/admin/students") {
    return protect("admin")(req, res, () =>
      adminController.getAllStudents(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/admin/classes") {
    return protect("admin")(req, res, () =>
      adminController.getAllClasses(req, res)
    );
  }

  // Announcements route
  if (req.method === "GET" && req.url === "/api/admin/announcements/recent") {
    return protect("admin")(req, res, () =>
      adminController.getRecentAnnouncements(req, res)
    );
  }

  // Academic performance route
  if (
    req.method === "GET" &&
    req.url === "/api/admin/academic/performance/grades"
  ) {
    return protect("admin")(req, res, () =>
      adminController.getAcademicPerformance(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
