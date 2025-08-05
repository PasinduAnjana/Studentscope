const adminController = require("../controllers/admin/dashboardController");
const { protect } = require("../middleware/authMiddleware");

module.exports = (req, res) => {
  if (req.method === "GET" && req.url === "/api/admin/dashboard") {
    return protect("admin")(req, res, () =>
      adminController.getDashboard(req, res)
    );
  }

  res.writeHead(404);
  res.end("Not Found");
};
