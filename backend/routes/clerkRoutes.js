const { protect } = require("../middleware/authMiddleware");
const studentsController = require("../controllers/clerk/studentsController");
const classesController = require("../controllers/clerk/classesController");
const teachersController = require("../controllers/clerk/teachersController");
const timetableController = require("../controllers/clerk/timetableController");
const profileController = require("../controllers/clerk/profileController");
const announcementsController = require("../controllers/clerk/announcementsController");
const achievementsController = require("../controllers/achievementsController");

const clerkService = require("../services/clerkService");
const examsController = require("../controllers/clerk/examsController");

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
    return protect("clerk")(req, res, () =>
      classesController.getSubjects(req, res)
    );
  }

  // Announcements routes
  if (
    req.method === "GET" &&
    req.url.match(/^\/api\/clerk\/announcements(\?.*)?$/)
  ) {
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

  // Password reset routes
  if (
    req.method === "GET" &&
    req.url === "/api/clerk/password-resets/pending"
  ) {
    return protect("clerk")(req, res, () =>
      profileController.getPendingPasswordResets(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/clerk/password-resets/") &&
    req.url.endsWith("/approve")
  ) {
    return protect("clerk")(req, res, () =>
      profileController.approvePasswordReset(req, res)
    );
  }

  if (
    req.method === "POST" &&
    req.url.startsWith("/api/clerk/password-resets/") &&
    req.url.endsWith("/reject")
  ) {
    return protect("clerk")(req, res, () =>
      profileController.rejectPasswordReset(req, res)
    );
  }

  // Achievements routes
  if (req.method === "GET" && req.url === "/api/clerk/achievements") {
    return protect("clerk")(req, res, () =>
      achievementsController.getAll(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/achievements") {
    return protect("clerk")(req, res, () =>
      achievementsController.create(req, res)
    );
  }

  if (
    req.method === "PUT" &&
    req.url.match(/^\/api\/clerk\/achievements\/\d+$/)
  ) {
    const id = req.url.split("/").pop();
    return protect("clerk")(req, res, () =>
      achievementsController.update(req, res, id)
    );
  }

  if (
    req.method === "DELETE" &&
    req.url.match(/^\/api\/clerk\/achievements\/\d+$/)
  ) {
    const id = req.url.split("/").pop();
    return protect("clerk")(req, res, () =>
      achievementsController.delete(req, res, id)
    );
  }

  // Exam routes
  if (req.method === "GET" && (req.url === "/api/clerk/exams" || req.url.startsWith("/api/clerk/exams?"))) {
    return protect("clerk")(req, res, () =>
      examsController.getExams(req, res)
    );
  }

  if (req.method === "POST" && req.url === "/api/clerk/exams") {
    return protect("clerk")(req, res, () =>
      examsController.createExam(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/exams\/\d+\/students$/)) {
    return protect("clerk")(req, res, () =>
      examsController.getExamStudents(req, res)
    );
  }

  if (req.method === "POST" && req.url.match(/^\/api\/clerk\/exams\/\d+\/students$/)) {
    return protect("clerk")(req, res, () =>
      examsController.assignStudents(req, res)
    );
  }

  if (req.method === "POST" && req.url.match(/^\/api\/clerk\/exams\/\d+\/marks$/)) {
    return protect("clerk")(req, res, () =>
      examsController.saveMarks(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/exams\/\d+\/marks/)) {
    return protect("clerk")(req, res, () =>
      examsController.getMarks(req, res)
    );
  }

  if (req.method === "PATCH" && req.url.match(/^\/api\/clerk\/exams\/\d+\/index$/)) {
    return protect("clerk")(req, res, () =>
      examsController.updateStudentIndex(req, res)
    );
  }

  if (req.method === "POST" && req.url.match(/^\/api\/clerk\/exams\/\d+\/import-index$/)) {
    return protect("clerk")(req, res, () =>
      examsController.bulkImportIndex(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/exams\/\d+\/subjects$/)) {
    return protect("clerk")(req, res, () =>
      examsController.getExamSubjects(req, res)
    );
  }

  if (req.method === "GET" && req.url.match(/^\/api\/clerk\/exams\/\d+\/all-marks$/)) {
    return protect("clerk")(req, res, () =>
      examsController.getAllExamMarks(req, res)
    );
  }



  res.writeHead(404);
  res.end("Not Found");
};
