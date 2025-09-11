exports.getTeacherWeeklyTimetable = async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId, 10);
    if (isNaN(teacherId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid teacher ID" }));
    }
    const timetable =
      await require("../../services/teacherService").getTeacherWeeklyTimetable(
        teacherId
      );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timetable));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch weekly timetable" }));
  }
};
const teacherService = require("../../services/teacherService");

exports.getTeacherTodayTimetable = async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId, 10);

    if (isNaN(teacherId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid teacher ID" }));
    }

    const timetable = await teacherService.getTeacherTodayTimetable(teacherId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timetable));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch timetable" }));
  }
};
