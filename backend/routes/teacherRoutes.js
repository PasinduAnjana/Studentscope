const studentController = require("../controllers/teacher/studentsController");
const timetableController = require("../controllers/teacher/timetableController");
const attendanceController = require("../controllers/teacher/attendanceController");
const subjectAssignmentController = require("../controllers/teacher/subjectAssignmentController");
const announcementsController = require("../controllers/teacher/announcementsController");
const profileController = require("../controllers/teacher/profileController");
const todoController = require("../controllers/teacher/todoController");
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
    return protect("teacher")(req, res, async () => {
      try {
        const teacherService = require("../services/teacherService");
        const exams = await teacherService.getAllExams();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(exams));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }

  // Marks routes
  if (req.method === "GET") {
    if (req.url === "/api/teacher/marks/data") {
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

    if (req.url.startsWith("/api/teacher/marks?")) {
        return protect("teacher")(req, res, async () => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const classId = url.searchParams.get("classId");
            const subjectId = url.searchParams.get("subjectId");
            const examId = url.searchParams.get("examId");

            if (classId && subjectId && examId) {
            const teacherService = require("../services/teacherService");
            const marks = await teacherService.getMarks(
                classId,
                subjectId,
                examId
            );
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(marks));
            } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required parameters" }));
            }
        } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
        }
        });
    }
  }

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

  // Teacher behavior records routes
  if (req.method === "GET" && req.url === "/api/teacher/behavior/records") {
    return protect("teacher")(req, res, async () => {
      try {
        const teacherService = require("../services/teacherService");
        const records = await teacherService.getTeacherBehaviorRecords(
          req.user.userId
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(records));
      } catch (error) {
        console.error("Error fetching teacher behavior records:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Failed to fetch behavior records",
          })
        );
      }
    });
  }

  // POST new behavior record
  if (req.method === "POST" && req.url === "/api/teacher/behavior/records") {
    return protect("teacher")(req, res, async () => {
      try {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          const data = JSON.parse(body);
          const { student_id, class_id, type, severity, description } = data;

          if (!student_id || !class_id || !type || !description) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Missing required fields" }));
            return;
          }

          const adminService = require("../services/adminService");
          const record = await adminService.addBehaviorRecord(
            student_id,
            class_id,
            type,
            severity,
            description,
            req.user.userId
          );
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: true, id: record.id, date: record.date })
          );
        });
      } catch (error) {
        console.error("Error adding behavior record:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Failed to add behavior record",
          })
        );
      }
    });
  }

  // DELETE behavior record (with ownership check)
  if (
    req.method === "DELETE" &&
    req.url.startsWith("/api/teacher/behavior/records")
  ) {
    return protect("teacher")(req, res, async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const recordId = url.searchParams.get("id");

        if (!recordId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Record ID required" }));
          return;
        }

        const teacherService = require("../services/teacherService");
        const adminService = require("../services/adminService");

        // Verify ownership: check if the record was created by this teacher
        const records = await teacherService.getTeacherBehaviorRecords(
          req.user.userId
        );
        const recordExists = records.some((r) => r.id == recordId);

        if (!recordExists) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "You can only delete your own records" })
          );
          return;
        }

        const success = await adminService.deleteBehaviorRecord(recordId);
        if (success) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Record not found" }));
        }
      } catch (error) {
        console.error("Error deleting behavior record:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Failed to delete behavior record",
          })
        );
      }
    });
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
  res.end(JSON.stringify({ error: "Route not found" }));
};
