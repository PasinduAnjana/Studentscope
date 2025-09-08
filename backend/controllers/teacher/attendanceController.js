const teacherService = require("../../services/teacherService");
const url = require("url");

exports.saveAttendance = async (req, res) => {
  try {
    // Ensure protect middleware attached user session
    const user = req.user;
    if (!user || user.role !== "teacher") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (!user.class_id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "No class is assigned to the teacher account" })
      );
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { date, records } = payload;

        // Basic validation
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Invalid or missing date (YYYY-MM-DD)" })
          );
          return;
        }

        if (!Array.isArray(records)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "records must be an array" }));
          return;
        }

        // Normalize statuses to booleans and shape
        const normalized = records
          .map((r) => ({
            student_id: r.student_id,
            status:
              r.status === true || r.status === "present" || r.status === 1
                ? true
                : false,
          }))
          .filter((r) => r.student_id); // keep only with student id

        const result = await teacherService.saveClassAttendance(
          user.class_id,
          date,
          normalized
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("Error parsing attendance payload:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON data" }));
      }
    });
  } catch (err) {
    console.error("Error saving attendance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to save attendance" }));
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "teacher") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (!user.class_id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "No class is assigned to the teacher account" })
      );
      return;
    }

    const parsed = url.parse(req.url, true);
    const date = parsed.query.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Invalid or missing date (YYYY-MM-DD)" })
      );
      return;
    }

    const records = await teacherService.getClassAttendanceByDate(
      user.class_id,
      date
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(records));
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch attendance" }));
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "teacher") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (!user.class_id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "No class is assigned to the teacher account" })
      );
      return;
    }

    const parsed = url.parse(req.url, true);
    let date = parsed.query.date;
    if (!date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      date = `${yyyy}-${mm}-${dd}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid date (YYYY-MM-DD)" }));
      return;
    }

    const result = await teacherService.clearClassAttendance(
      user.class_id,
      date
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, deleted: result.deleted }));
  } catch (err) {
    console.error("Error deleting attendance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete attendance" }));
  }
};
