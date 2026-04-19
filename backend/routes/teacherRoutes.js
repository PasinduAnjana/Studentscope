const studentController = require("../controllers/teacher/studentsController");
const timetableController = require("../controllers/teacher/timetableController");
const attendanceController = require("../controllers/teacher/attendanceController");
const subjectAssignmentController = require("../controllers/teacher/subjectAssignmentController");
const announcementsController = require("../controllers/teacher/announcementsController");
const eventsController = require("../controllers/teacher/eventsController");
const profileController = require("../controllers/teacher/profileController");
const todoController = require("../controllers/teacher/todoController");
const examsController = require("../controllers/teacher/examsController");
const marksController = require("../controllers/teacher/marksController");
const behaviorController = require("../controllers/teacher/behaviorController");
const { protect } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  // Students routes
  if (req.method === "GET" && req.url === "/api/teacher/students") {
    return protect("teacher")(req, res, () =>
      studentController.getAllStudents(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/students/class/")
  ) {
    const classId = req.url.split("/").pop();
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getStudentsByClass(
        { ...req, params: { classId } },
        res
      )
    );
  }

  // Profile route
  if (req.method === "GET" && req.url === "/api/teacher/profile") {
    return protect("teacher")(req, res, () =>
      profileController.getProfile(req, res)
    );
  }

  // Teacher classes route
  if (req.method === "GET" && req.url === "/api/teacher/profile/classes") {
    return protect("teacher")(req, res, () =>
      profileController.getTeacherClasses(req, res)
    );
  }

  // Change password route
  if (req.method === "PUT" && req.url === "/api/teacher/change-password") {
    return protect("teacher")(req, res, () =>
      profileController.changePassword(req, res)
    );
  }

  // Subjects routes
  if (req.method === "GET" && req.url === "/api/teacher/subjects") {
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getAllSubjects(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/subjects/elective/")
  ) {
    const classId = req.url.split("/").pop();
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getElectiveSubjects(
        { ...req, params: { classId } },
        res
      )
    );
  }

  // Classes routes - FIXED: Use the correct controller function
  if (req.method === "GET" && req.url === "/api/teacher/classes") {
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getAllClasses(req, res)
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/classes/") &&
    req.url.endsWith("/info")
  ) {
    const urlParts = req.url.split("/");
    const classId = urlParts[urlParts.length - 2]; // Get class ID before "/info"
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getClassInfo(
        { ...req, params: { classId } },
        res
      )
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/classes/") &&
    req.url.endsWith("/subjects/teacher")
  ) {
    const urlParts = req.url.split("/");
    const classId = urlParts[urlParts.length - 3];
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getTeacherClassSubjects(
        { ...req, params: { classId } },
        res
      )
    );
  }



  // Get classes assigned to the authenticated teacher (no teacherId in URL)
  if (req.method === "GET" && req.url === "/api/teacher/classes/teacher") {
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getTeacherClasses(req, res)
    );
  }


  // Grade rules routes
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/grade/") &&
    req.url.endsWith("/rules")
  ) {
    const urlParts = req.url.split("/");
    const grade = urlParts[urlParts.length - 2]; // Get grade before "/rules"
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getGradeSubjectRules(
        { ...req, params: { grade } },
        res
      )
    );
  }

  // Student subjects routes
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/students/") &&
    req.url.endsWith("/subjects")
  ) {
    const urlParts = req.url.split("/");
    const studentId = urlParts[urlParts.length - 2]; // Get student ID before "/subjects"
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getStudentSubjects(
        { ...req, params: { studentId } },
        res
      )
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/teacher/students/") &&
    req.url.endsWith("/subjects")
  ) {
    const urlParts = req.url.split("/");
    const studentId = urlParts[urlParts.length - 2]; // Get student ID before "/subjects"
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.saveStudentSubjects(
        { ...req, params: { studentId } },
        res
      )
    );
  }

  // Batch subject assignment
  if (
    req.method === "POST" &&
    req.url === "/api/teacher/students/subjects/batch"
  ) {
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.saveMultipleStudentSubjects(req, res)
    );
  }

  // Combined data endpoint for subject assignment page
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/subjects/assignment/")
  ) {
    const classId = req.url.split("/").pop();
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getSubjectAssignmentData(
        { ...req, params: { classId } },
        res
      )
    );
  }

  // Timetable routes
  // Get today's timetable for the authenticated teacher (no teacherId in URL)
  if (req.method === "GET" && req.url === "/api/teacher/timetable/today") {
    return protect("teacher")(req, res, () =>
      timetableController.getTeacherTodayTimetable(req, res)
    );
  }

  // Weekly Timetable route (no teacherId in URL)
  if (req.method === "GET" && req.url === "/api/teacher/timetable/week") {
    return protect("teacher")(req, res, () =>
      timetableController.getTeacherWeeklyTimetable(req, res)
    );
  }

  // Attendance routes
  // Weekly and monthly aggregated endpoints (must come before generic GET)
  if (req.method === "GET" && req.url === "/api/teacher/attendance/weekly") {
    return protect("teacher")(req, res, () =>
      attendanceController.getWeeklyAttendance(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/teacher/attendance/monthly") {
    return protect("teacher")(req, res, () =>
      attendanceController.getMonthlyAttendance(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/teacher/attendance") {
    return protect("teacher")(req, res, () =>
      attendanceController.saveAttendance(req, res)
    );
  }

  if (req.method === "GET" && req.url.startsWith("/api/teacher/attendance")) {
    return protect("teacher")(req, res, () =>
      attendanceController.getAttendance(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.startsWith("/api/teacher/attendance")
  ) {
    return protect("teacher")(req, res, () =>
      attendanceController.deleteAttendance(req, res)
    );
  }


  // Get all exams
  if (req.method === "GET" && req.url === "/api/teacher/exams") {
    return protect("teacher")(req, res, () =>
      examsController.getAllExams(req, res)
    );
  }

  // Marks routes
  if (req.method === "GET" && req.url === "/api/teacher/marks/data") {
    return protect("teacher")(req, res, () =>
      marksController.getMarksData(req, res)
    );
  }

  if (req.method === "GET" && (req.url === "/api/teacher/marks" || req.url.startsWith("/api/teacher/marks?"))) {
    return protect("teacher")(req, res, () =>
      marksController.getMarks(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/teacher/marks") {
    return protect("teacher")(req, res, () =>
      marksController.saveMarks(req, res)
    );
  }

  // Announcements routes
  if (req.method === "GET" && req.url === "/api/teacher/announcements") {
    return protect("teacher")(req, res, () =>
      announcementsController.getAllAnnouncements(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/teacher/announcements") {
    return protect("teacher")(req, res, () =>
      announcementsController.createAnnouncement(req, res)
    );
  }

  if (
    req.method === "PUT" &&
    req.url.startsWith("/api/teacher/announcements/")
  ) {
    return protect("teacher")(req, res, () =>
      announcementsController.updateAnnouncement(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.startsWith("/api/teacher/announcements/")
  ) {
    return protect("teacher")(req, res, () =>
      announcementsController.deleteAnnouncement(req, res)
    );
  }

  // Get announcements sent to teacher
  if (
    req.method === "GET" &&
    req.url === "/api/teacher/announcements/received"
  ) {
    return protect("teacher")(req, res, () =>
      announcementsController.getAnnouncementsForTeacher(req, res)
    );
  }

  // Events API
  if (req.method === "GET" && req.url === "/api/teacher/events") {
    return protect("teacher")(req, res, () => eventsController.getEvents(req, res));
  }
  if (req.method === "POST" && req.url === "/api/teacher/events") {
    return protect("teacher")(req, res, () => eventsController.createEvent(req, res));
  }
  if (req.method === "DELETE" && req.url.match(/^\/api\/teacher\/events\/\d+$/)) {
    return protect("teacher")(req, res, () => eventsController.deleteEvent(req, res));
  }

  if (req.method === "PUT" && req.url.match(/^\/api\/teacher\/events\/\d+$/)) {
    return protect("teacher")(req, res, () => eventsController.updateEvent(req, res));
  }

  // Teacher behavior records routes
  if (req.method === "GET" && req.url === "/api/teacher/behavior/records") {
    return protect("teacher")(req, res, () =>
      behaviorController.getRecords(req, res)
    );
  }

  // POST new behavior record
  if (req.method === "POST" && req.url === "/api/teacher/behavior/records") {
    return protect("teacher")(req, res, () =>
      behaviorController.createRecord(req, res)
    );
  }

  // PUT update behavior record
  if (
    req.method === "PUT" &&
    req.url.startsWith("/api/teacher/behavior/records")
  ) {
    return protect("teacher")(req, res, () =>
      behaviorController.updateRecord(req, res)
    );
  }

  // DELETE behavior record (with ownership check)
  if (
    req.method === "DELETE" &&
    req.url.startsWith("/api/teacher/behavior/records")
  ) {
    return protect("teacher")(req, res, () =>
      behaviorController.deleteRecord(req, res)
    );
  }

  // Todo routes
  if (req.method === "GET" && req.url === "/api/teacher/todos") {
    return protect("teacher")(req, res, () =>
      todoController.getAllTodos(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/teacher/todos") {
    return protect("teacher")(req, res, () =>
      todoController.createTodo(req, res)
    );
  }

  if (req.method === "PUT" && req.url.startsWith("/api/teacher/todos/")) {
    const pathParts = req.url.split("/");
    // Check if it's a status update route: /api/teacher/todos/{id}/status
    if (pathParts[pathParts.length - 1] === "status") {
      return protect("teacher")(req, res, () =>
        todoController.updateTodoStatus(req, res)
      );
    }
    // Regular todo text update
    return protect("teacher")(req, res, () =>
      todoController.updateTodo(req, res)
    );
  }

  if (req.method === "DELETE" && req.url.startsWith("/api/teacher/todos/")) {
    return protect("teacher")(req, res, () =>
      todoController.deleteTodo(req, res)
    );
  }

  // Password reset routes
  if (
    req.method === "GET" &&
    req.url === "/api/teacher/password-resets/pending"
  ) {
    return protect("teacher")(req, res, () =>
      profileController.getPendingPasswordResets(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/teacher/password-resets/") &&
    req.url.endsWith("/approve")
  ) {
    return protect("teacher")(req, res, () =>
      profileController.approvePasswordReset(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/teacher/password-resets/") &&
    req.url.endsWith("/reject")
  ) {
    return protect("teacher")(req, res, () =>
      profileController.rejectPasswordReset(req, res)
    );
  }

  // 404 - Route not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
};
