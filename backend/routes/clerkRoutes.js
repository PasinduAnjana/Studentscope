const { protect } = require("../middleware/authMiddleware");
const studentsController = require("../controllers/clerk/studentsController");
const classesController = require("../controllers/clerk/classesController");
const teachersController = require("../controllers/clerk/teachersController");
const timetableController = require("../controllers/clerk/timetableController");
const profileController = require("../controllers/clerk/profileController");
const announcementsController = require("../controllers/clerk/announcementsController");
const clerkService = require("../services/clerkService");

module.exports = async (req, res) => {
  // Students CRUD routes
  if (req.method === "GET" && req.url === "/api/clerk/students") {
    return protect("clerk")(req, res, () =>
      studentsController.getAllStudents(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/students\/\d+$/)) {
    return protect("clerk")(req, res, () =>
      studentsController.getStudentById(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/students") {
    return protect("clerk")(req, res, () =>
      studentsController.createStudent(req, res)
    );
  }

  if (req.method === "PUT" && req.url.match(/^\/api\/clerk\/students\/\d+$/)) {
    return protect("clerk")(req, res, () =>
      studentsController.updateStudent(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/clerk\/students\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      studentsController.deleteStudent(req, res)
    );
  }

  // Classes route
  if (req.method === "GET" && req.url === "/api/clerk/classes") {
    return protect("clerk")(req, res, () =>
      classesController.getClasses(req, res)
    );
  }

  // Profile route
  if (req.method === "GET" && req.url === "/api/clerk/profile") {
    return protect("clerk")(req, res, () =>
      profileController.getProfile(req, res)
    );
  }

  // Teachers route
  if (req.method === "GET" && req.url === "/api/clerk/teachers") {
    return protect("clerk")(req, res, () =>
      teachersController.getTeachers(req, res)
    );
  }

  // Assign teacher to class route
  if (
    req.method === "POST" &&
    req.url === "/api/clerk/classes/assign-teacher"
  ) {
    return protect("clerk")(req, res, () =>
      classesController.assignTeacher(req, res)
    );
  }

  // Delete class route
  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/clerk\/classes\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      classesController.deleteClass(req, res)
    );
  }

  // Teachers routes
  if (req.method === "GET" && req.url === "/api/clerk/teachers") {
    return protect("clerk")(req, res, () =>
      teachersController.getTeachers(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/teachers\/\d+$/)) {
    return protect("clerk")(req, res, () =>
      teachersController.getTeacherById(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/teachers") {
    return protect("clerk")(req, res, () =>
      teachersController.createTeacher(req, res)
    );
  }

  if (req.method === "PUT" && req.url.match(/^\/api\/clerk\/teachers\/\d+$/)) {
    return protect("clerk")(req, res, () =>
      teachersController.updateTeacher(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/clerk\/teachers\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      teachersController.deleteTeacher(req, res)
    );
  }

  // Legacy route for backward compatibility
  if (req.method === "POST" && req.url === "/api/clerk/student/add") {
    return protect("clerk")(req, res, () =>
      studentsController.createStudent(req, res)
    );
  }

  // Timetable routes
  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/clerk\/timetable\/class\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      timetableController.getTimetableForClass(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/timetable/assign") {
    return protect("clerk")(req, res, () =>
      timetableController.assignTimetableSlot(req, res)
    );
  }

  // Subjects route
  if (req.method === "GET" && req.url === "/api/clerk/subjects") {
    return protect("clerk")(req, res, async () => {
      try {
        const subjects = await clerkService.getSubjects();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(subjects));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch subjects" }));
      }
    });
  }

  // Announcements routes
  if (req.method === "GET" && req.url === "/api/clerk/announcements") {
    return protect("clerk")(req, res, () =>
      announcementsController.getAllAnnouncements(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/announcements") {
    return protect("clerk")(req, res, () =>
      announcementsController.createAnnouncement(req, res)
    );
  }

  if (
    req.method === "PUT" &&
    req.url.match(/^\/api\/clerk\/announcements\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      announcementsController.updateAnnouncement(req, res)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/clerk\/announcements\/\d+$/)
  ) {
    return protect("clerk")(req, res, () =>
      announcementsController.deleteAnnouncement(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
