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

exports.getAllStudents = async (req, res) => {
  try {
    const students = await adminService.getAllStudents();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Error fetching students:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await adminService.getAllClasses();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch classes" }));
  }
};

exports.getRecentAnnouncements = async (req, res) => {
  try {
    const announcements = await adminService.getRecentAnnouncements();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch announcements" }));
  }
};

exports.getAcademicPerformance = async (req, res) => {
  try {
    const performance = await adminService.getAcademicPerformanceByGrade();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(performance));
  } catch (err) {
    console.error("Error fetching academic performance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch academic performance" }));
  }
};
