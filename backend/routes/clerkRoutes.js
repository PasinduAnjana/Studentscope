const { protect } = require("../middleware/authMiddleware");
const studentsController = require("../controllers/clerk/studentsController");
const classesController = require("../controllers/clerk/classesController");

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

  // Legacy route for backward compatibility
  if (req.method === "POST" && req.url === "/api/clerk/student/add") {
    return protect("clerk")(req, res, () =>
      studentsController.createStudent(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
