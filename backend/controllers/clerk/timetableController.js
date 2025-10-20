const clerkService = require("../../services/clerkService");

exports.getTimetableForClass = async (req, res) => {
  try {
    const classId = req.url.split("/").pop();
    if (!classId || isNaN(classId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid class ID" }));
    }
    const timetable = await clerkService.getTimetableForClass(
      parseInt(classId)
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timetable));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch timetable" }));
  }
};

exports.assignTimetableSlot = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      const { class_id, day_of_week, period_number, subject_id, teacher_id } =
        JSON.parse(body);

      if (
        !class_id ||
        !day_of_week ||
        !period_number ||
        !subject_id ||
        !teacher_id
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Missing required fields" }));
      }

      await clerkService.assignTimetableSlot(
        class_id,
        day_of_week,
        period_number,
        subject_id,
        teacher_id
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Assignment saved successfully" }));
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to assign timetable slot" }));
  }
};
