const authService = require("../../services/authService");
const teacherService = require("../../services/teacherService");
const pool = require("../../db");

exports.getProfile = async (req, res) => {
  try {
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    // Fetch teacher details
    const detailsRes = await pool.query(
      `SELECT full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, level, birthday
       FROM teacher_details WHERE teacher_id = $1`,
      [session.userId]
    );

    // Return teacher profile information
    const profile = {
      id: session.userId,
      username: session.username,
      role: session.role,
      class_id: session.class_id,
      class_name: session.class_name,
      class_grade: session.class_grade,
      is_class_teacher: session.is_class_teacher,
      details: detailsRes.rows.length > 0 ? detailsRes.rows[0] : null,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(profile));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch profile" }));
  }
};

exports.getTeacherClasses = async (req, res) => {
  try {
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    // Get classes the teacher is teaching
    const classes = await teacherService.getTeacherClasses(session.userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch teacher classes" }));
  }
};
