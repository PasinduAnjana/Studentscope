const adminService = require("../../services/adminService");

exports.getDashboard = async (req, res) => {
  try {
    const summary = await adminService.getDashboardStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(summary));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Failed to load dashboard" }));
  }
};
