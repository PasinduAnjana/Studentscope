const adminController = require("../controllers/admin/dashboardController");
const attendanceController = require("../controllers/admin/attendanceController");
const behaviorController = require("../controllers/admin/behaviorController");
const alertsController = require("../controllers/admin/alertsController");
const announcementsController = require("../controllers/clerk/announcementsController");
const eventsController = require("../controllers/clerk/eventsController");
const profileController = require("../controllers/admin/profileController");
const { protect } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  if (req.method === "GET" && req.url === "/api/admin/dashboard") {
    return protect("admin")(req, res, () =>
      adminController.getDashboard(req, res)
    );
  }

  // Alerts routes
  if (req.method === "GET" && req.url === "/api/admin/alerts") {
    return protect("admin")(req, res, () =>
      alertsController.getAlerts(req, res)
    );
  }

  if (req.method === "GET" && req.url.startsWith("/api/admin/alerts/details")) {
    return protect("admin")(req, res, () =>
      alertsController.getAlertDetails(req, res)
    );
  }

  // Behavior routes
  if (req.method === "GET" && req.url === "/api/admin/behavior/stats") {
    return protect("admin")(req, res, () =>
      behaviorController.getBehaviorStats(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/behavior/records")
  ) {
    return protect("admin")(req, res, () =>
      behaviorController.getBehaviorRecords(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/admin/behavior/records") {
    return protect("admin")(req, res, () =>
      behaviorController.addBehaviorRecord(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.startsWith("/api/admin/behavior/records")
  ) {
    return protect("admin")(req, res, () =>
      behaviorController.deleteBehaviorRecord(req, res)
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

  // Student profile routes
  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/admin\/students\/\d+$/)
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentProfile(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/admin\/students\/\d+\/attendance/)
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentAttendance(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/admin\/students\/\d+\/marks/)
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentMarks(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/admin\/students\/\d+\/behavior/)
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentBehavior(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/admin\/students\/\d+\/gov-exams/)
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentGovExams(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/admin/classes") {
    return protect("admin")(req, res, () =>
      adminController.getAllClasses(req, res)
    );
  }

  // Teachers route for announcements page
  if (req.method === "GET" && req.url === "/api/admin/teachers") {
    return protect("admin")(req, res, () =>
      adminController.getAllTeachers(req, res)
    );
  }

  // Clerks route for announcements page
  if (req.method === "GET" && req.url === "/api/admin/clerks") {
    return protect("admin")(req, res, () =>
      adminController.getAllClerks(req, res)
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

  // Subject performance route
  if (
    req.method === "GET" &&
    req.url === "/api/admin/academic/performance/subjects"
  ) {
    return protect("admin")(req, res, () =>
      adminController.getSubjectPerformance(req, res)
    );
  }

  // Top performers route
  if (
    req.method === "GET" &&
    req.url === "/api/admin/academic/top-performers"
  ) {
    return protect("admin")(req, res, () =>
      adminController.getTopPerformers(req, res)
    );
  }

  // Students needing attention route
  if (
    req.method === "GET" &&
    req.url === "/api/admin/academic/attention-needed"
  ) {
    return protect("admin")(req, res, () =>
      adminController.getStudentsNeedingAttention(req, res)
    );
  }

  // Recent exams route
  if (req.method === "GET" && req.url === "/api/admin/academic/recent-exams") {
    return protect("admin")(req, res, () =>
      adminController.getRecentExams(req, res)
    );
  }

  // Performance distribution route
  if (
    req.method === "GET" &&
    req.url === "/api/admin/academic/performance-distribution"
  ) {
    return protect("admin")(req, res, () =>
      adminController.getPerformanceDistribution(req, res)
    );
  }

  // Academic reports routes
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/academic/reports/filters")
  ) {
    return protect("admin")(req, res, () =>
      adminController.getAcademicReportsFilters(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/academic/reports/data")
  ) {
    return protect("admin")(req, res, () =>
      adminController.getAcademicReportsData(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/academic/reports/summary")
  ) {
    return protect("admin")(req, res, () =>
      adminController.getAcademicReportsSummary(req, res)
    );
  }

  // Announcements routes (identical to clerk)
  if (req.method === "GET" && req.url.startsWith("/api/admin/announcements")) {
    // Check if this is a query for staff announcements
    if (req.url.includes("role=staff")) {
      return protect("admin")(req, res, () =>
        announcementsController.getStaffAnnouncements(req, res)
      );
    }
    return protect("admin")(req, res, () =>
      announcementsController.getAllAnnouncements(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/admin/announcements") {
    return protect("admin")(req, res, () =>
      announcementsController.createAnnouncement(req, res)
    );
  }

  if (
    req.method === "PUT" &&
    req.url.match(/^\/api\/admin\/announcements\/\d+$/)
  ) {
    return protect("admin")(req, res, () =>
      announcementsController.updateAnnouncement(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/admin\/announcements\/\d+$/)
  ) {
    return protect("admin")(req, res, () =>
      announcementsController.deleteAnnouncement(req, res)
    );
  }

  // Events API
  if (req.method === "GET" && req.url === "/api/admin/events") {
    return protect("admin")(req, res, () => eventsController.getEvents(req, res));
  }
  if (req.method === "POST" && req.url === "/api/admin/events") {
    return protect("admin")(req, res, () => eventsController.createEvent(req, res));
  }
  if (req.method === "DELETE" && req.url.match(/^\/api\/admin\/events\/\d+$/)) {
    return protect("admin")(req, res, () => eventsController.deleteEvent(req, res));
  }

  // Password reset routes
  if (
    req.method === "GET" &&
    req.url === "/api/admin/password-resets/pending"
  ) {
    return protect("admin")(req, res, () =>
      profileController.getPendingPasswordResets(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/admin/password-resets/") &&
    req.url.endsWith("/approve")
  ) {
    return protect("admin")(req, res, () =>
      profileController.approvePasswordReset(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/admin/password-resets/") &&
    req.url.endsWith("/reject")
  ) {
    return protect("admin")(req, res, () =>
      profileController.rejectPasswordReset(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
