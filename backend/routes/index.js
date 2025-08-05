const authRoutes = require("./authRoutes");
// const studentRoutes = require("./studentRoutes");
const teacherRoutes = require("./teacherRoutes");
const adminRoutes = require("./adminRoutes");

module.exports = (req, res) => {
  if (req.url.startsWith("/api/auth")) return authRoutes(req, res);
  // if (req.url.startsWith("/api/student")) return studentRoutes(req, res);
  if (req.url.startsWith("/api/teacher")) return teacherRoutes(req, res);
  if (req.url.startsWith("/api/admin")) return adminRoutes(req, res);

  res.writeHead(404);
  res.end("Not Found");
};
