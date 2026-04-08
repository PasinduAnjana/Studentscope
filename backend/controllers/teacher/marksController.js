const teacherService = require("../../services/teacherService");

exports.getMarksData = async (req, res) => {
  try {
    const data = await teacherService.getTeacherMarksData(req.user.userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch marks data" }));
  }
};

exports.getMarks = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const examId = url.searchParams.get("examId");

    if (!classId || !subjectId || !examId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required parameters" }));
      return;
    }

    const marks = await teacherService.getMarks(classId, subjectId, examId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(marks));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch marks" }));
  }
};

exports.saveMarks = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const marksData = JSON.parse(body);
      const result = await teacherService.saveMarks(marksData);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("Database error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to save marks" }));
    }
  });
};