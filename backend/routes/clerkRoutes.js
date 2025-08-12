const { protect } = require("../middleware/authMiddleware");
const studentsController = require("../controllers/clerk/studentsController");
const classesController = require("../controllers/clerk/classesController");

module.exports = async (req, res) => {
  if (req.method === "POST" && req.url === "/api/clerk/student/add") {
    return protect("clerk")(req, res, () =>
      studentsController.addStudent(req, res)
    );
  }

  if (req.method === "GET" && req.url === "/api/clerk/classes") {
    return protect("clerk")(req, res, () =>
      classesController.getClasses(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
