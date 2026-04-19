const teacherService = require("../../services/teacherService");
const adminService = require("../../services/adminService");
const auditService = require("../../services/auditService");

exports.getRecords = async (req, res) => {
  try {
    const records = await teacherService.getTeacherBehaviorRecords(
      req.user.userId
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(records));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch behavior records" }));
  }
};

exports.createRecord = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const data = JSON.parse(body);
      const { student_id, class_id, type, severity, description } = data;

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
        req.user.userId
      );

      try {
        if (req.user?.userId) {
          await auditService.logAction(req.user.userId, "create", "behavior", record.id, null, {
            student_id,
            type,
            severity,
            description
          });
        }
      } catch (auditErr) {
        console.error("Audit log failed:", auditErr);
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, id: record.id, date: record.date }));
    } catch (err) {
      console.error("Database error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to add behavior record" }));
    }
  });
};

exports.deleteRecord = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const recordId = url.searchParams.get("id");

    if (!recordId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Record ID required" }));
      return;
    }

    const records = await teacherService.getTeacherBehaviorRecords(
      req.user.userId
    );
    const recordExists = records.some((r) => r.id == recordId);

    if (!recordExists) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "You can only delete your own records" }));
      return;
    }

    const success = await adminService.deleteBehaviorRecord(recordId);

    try {
      if (req.user?.userId) {
        await auditService.logAction(req.user.userId, "delete", "behavior", recordId, null, null);
      }
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    if (success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Record not found" }));
    }
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete behavior record" }));
  }
};