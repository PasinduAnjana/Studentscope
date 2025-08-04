const { getAllStudents } = require("../controllers/studentController");
const { protect, getRoleFromCookie } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  if (req.method === "GET") {
    const role = getRoleFromCookie(req);
    if (!role || !["admin", "teacher", "clerk"].includes(role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Access denied" }));
    }

    return getAllStudents(req, res);
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Method Not Allowed" }));
};
