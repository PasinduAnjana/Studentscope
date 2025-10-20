const { protect } = require("../middleware/authMiddleware");
const studentsController = require("../controllers/clerk/studentsController");
const classesController = require("../controllers/clerk/classesController");
const teachersController = require("../controllers/clerk/teachersController");

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

  res.writeHead(404);
  res.end("Not Found");
};
