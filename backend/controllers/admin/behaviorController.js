const adminService = require("../../services/adminService");

exports.getBehaviorStats = async (req, res) => {
  try {
    const stats = await adminService.getBehaviorStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
  } catch (err) {
    console.error("Error fetching behavior stats:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch behavior statistics" }));
  }
};

exports.getBehaviorRecords = async (req, res) => {
  try {
    // Parse query parameters for filters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const classId = url.searchParams.get("class_id");
    const type = url.searchParams.get("type");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    const filters = {};
    if (classId) filters.class_id = classId;
    if (type) filters.type = type;
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const records = await adminService.getBehaviorRecords(filters);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(records));
  } catch (err) {
    console.error("Error fetching behavior records:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch behavior records" }));
  }
};

exports.addBehaviorRecord = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      const data = JSON.parse(body);
      const {
        student_id,
        class_id,
        type,
        severity,
        description,
        reported_by_id,
      } = data;

      if (!student_id || !class_id || !type || !description) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }

      const record = await adminService.addBehaviorRecord(
        student_id,
        class_id,
        type,
        severity,
        description,
        reported_by_id
      );
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ success: true, id: record.id, date: record.date })
      );
    });
  } catch (err) {
    console.error("Error adding behavior record:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to add behavior record" }));
  }
};

exports.deleteBehaviorRecord = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const recordId = url.searchParams.get("id");

    if (!recordId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Record ID required" }));
      return;
    }

    const success = await adminService.deleteBehaviorRecord(recordId);
    if (success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Record not found" }));
    }
  } catch (err) {
    console.error("Error deleting behavior record:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete behavior record" }));
  }
};
