const studentController = require("../controllers/teacher/studentsController");
const { protect } = require("../middleware/authMiddleware");
module.exports = (req, res) => {
  if (req.method === "GET" && req.url === "/api/teacher/students") {
    return protect("teacher")(req, res, () =>
      studentController.getAllStudents(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
