const studentController = require("../controllers/teacher/studentsController");
const timetableController = require("../controllers/teacher/timetableController");
const attendanceController = require("../controllers/teacher/attendanceController");
const subjectAssignmentController = require("../controllers/teacher/subjectAssignmentController");
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
    req.url.endsWith("/subjects")
  ) {
    const urlParts = req.url.split("/");
    const classId = urlParts[urlParts.length - 2]; // Get class ID before "/subjects"
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getClassSubjects(
        { ...req, params: { classId } },
        res
      )
    );
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/classes/teacher/")
  ) {
    const teacherId = req.url.split("/").pop();
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getTeacherClasses(
        { ...req, params: { teacherId } },
        res
      )
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
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/timetable/today/")
  ) {
    const teacherId = req.url.split("/").pop();
    return protect("teacher")(req, res, () =>
      timetableController.getTeacherTodayTimetable(
        { ...req, params: { teacherId } },
        res
      )
    );
  }

  // Attendance routes
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

  // 404 - Route not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found" }));
};
