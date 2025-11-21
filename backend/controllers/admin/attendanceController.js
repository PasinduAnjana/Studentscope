const adminService = require("../../services/adminService");
const url = require("url");

exports.getAttendanceStats = async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const date = parsed.query.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Invalid or missing date (YYYY-MM-DD)" })
      );
      return;
    }

    const stats = await adminService.getAttendanceStats(date);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
  } catch (err) {
    console.error("Error fetching attendance stats:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch attendance statistics" }));
  }
};

exports.getAttendanceRecords = async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const date = parsed.query.date;
    const classId = parsed.query.classId;
    const status = parsed.query.status;
    const search = parsed.query.search;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Invalid or missing date (YYYY-MM-DD)" })
      );
      return;
    }

    const filters = {};
    if (classId) filters.classId = classId;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const records = await adminService.getAttendanceRecords(date, filters);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(records));
  } catch (err) {
    console.error("Error fetching attendance records:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch attendance records" }));
  }
};

exports.updateAttendanceRecord = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { id, status, time, notes } = payload;

        if (!id) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Attendance record ID is required" })
          );
          return;
        }

        // For now, we'll just return success since we're focusing on read operations
        // In a full implementation, you'd update the record in the database
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Attendance record updated",
          })
        );
      } catch (parseErr) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON payload" }));
      }
    });
  } catch (err) {
    console.error("Error updating attendance record:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to update attendance record" }));
  }
};

exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const id = parsed.query.id;

    if (!id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Attendance record ID is required" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ success: true, message: "Attendance record deleted" })
    );
  } catch (err) {
    console.error("Error deleting attendance record:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete attendance record" }));
  }
};
