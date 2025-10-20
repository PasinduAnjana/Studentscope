const studentController = require("../controllers/teacher/studentsController");
const timetableController = require("../controllers/teacher/timetableController");
const attendanceController = require("../controllers/teacher/attendanceController");
const subjectAssignmentController = require("../controllers/teacher/subjectAssignmentController");
const announcementsController = require("../controllers/teacher/announcementsController");
const profileController = require("../controllers/teacher/profileController");
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
    const classId = urlParts[urlParts.length - 3]; // Get class ID before "/subjects/teacher"
    return protect("teacher")(req, res, async () => {
      try {
        const teacherService = require("../services/teacherService");
        const subjects = await teacherService.getTeacherClassSubjects(
          req.user.userId,
          classId
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(subjects));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/teacher/classes/") &&
    req.url.endsWith("/subjects/all")
  ) {
    const urlParts = req.url.split("/");
    const classId = urlParts[urlParts.length - 3]; // Get class ID before "/subjects/all"
    return protect("teacher")(req, res, async () => {
      try {
        const teacherService = require("../services/teacherService");
        const subjects = await teacherService.getAllClassSubjects(classId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(subjects));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }

  // Get classes assigned to the authenticated teacher (no teacherId in URL)
  if (req.method === "GET" && req.url === "/api/teacher/classes/teacher") {
    return protect("teacher")(req, res, () =>
      subjectAssignmentController.getTeacherClasses(req, res)
    );
  }

  // Get teacher data for marks dashboard
  if (req.method === "GET" && req.url === "/api/teacher/marks/data") {
    return protect("teacher")(req, res, async () => {
      try {
        const teacherService = require("../services/teacherService");
        const data = await teacherService.getTeacherMarksData(req.user.userId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
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

  // Marks routes
  if (req.method === "POST" && req.url === "/api/teacher/marks") {
    return protect("teacher")(req, res, async () => {
      try {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          const marksData = JSON.parse(body);
          const teacherService = require("../services/teacherService");
          const result = await teacherService.saveMarks(marksData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        });
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
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

  // 404 - Route not found

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found" }));
};
