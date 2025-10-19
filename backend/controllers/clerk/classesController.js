const clerkService = require("../../services/clerkService");

exports.getClasses = async (req, res) => {
  try {
    const classes = await clerkService.getAllClasses();

    const json = JSON.stringify(classes);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  } catch (err) {
    console.error("Error fetching classes:", err);

    const errorJson = JSON.stringify({ error: "Internal Server Error" });

    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await clerkService.getTeachers();

    const json = JSON.stringify(teachers);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  } catch (err) {
    console.error("Error fetching teachers:", err);

    const errorJson = JSON.stringify({ error: "Internal Server Error" });

    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.assignTeacher = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { grade, class_name, teacher_id } = JSON.parse(body);

        if (!class_name) {
          const errorJson = JSON.stringify({
            error: "Class name is required",
          });
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(errorJson),
          });
          res.end(errorJson);
          return;
        }

        // Find the class by grade and name
        const pool = require("../../db");
        let classResult = await pool.query(
          "SELECT id FROM classes WHERE grade = $1 AND name = $2",
          [grade, class_name]
        );

        let classId;
        if (classResult.rows.length === 0) {
          // Class doesn't exist, create it
          classId = await clerkService.createClass(grade, class_name);
        } else {
          classId = classResult.rows[0].id;
        }

        await clerkService.assignClassTeacher(classId, teacher_id);

        const successJson = JSON.stringify({
          message: "Teacher assigned successfully",
        });
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(successJson),
        });
        res.end(successJson);
      } catch (parseErr) {
        console.error("Error parsing request:", parseErr);
        const errorJson = JSON.stringify({ error: "Invalid request data" });
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(errorJson),
        });
        res.end(errorJson);
      }
    });
  } catch (err) {
    console.error("Error assigning teacher:", err);
    const errorJson = JSON.stringify({ error: "Internal Server Error" });
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const urlParts = req.url.split("/");
    const classId = parseInt(urlParts[urlParts.length - 1]);

    if (isNaN(classId)) {
      const errorJson = JSON.stringify({ error: "Invalid class ID" });
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    // Check if class exists
    const pool = require("../../db");
    const classResult = await pool.query("SELECT id FROM classes WHERE id = $1", [classId]);
    if (classResult.rows.length === 0) {
      const errorJson = JSON.stringify({ error: "Class not found" });
      res.writeHead(404, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    // Check if there are students in the class
    const studentCount = await pool.query("SELECT COUNT(*) FROM users WHERE class_id = $1", [classId]);
    if (parseInt(studentCount.rows[0].count) > 0) {
      const errorJson = JSON.stringify({ error: "Cannot delete class with students assigned" });
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    // Delete class teacher assignments first
    await pool.query("DELETE FROM class_teachers WHERE class_id = $1", [classId]);

    // Delete the class
    await pool.query("DELETE FROM classes WHERE id = $1", [classId]);

    const successJson = JSON.stringify({ message: "Class deleted successfully" });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(successJson),
    });
    res.end(successJson);
  } catch (err) {
    console.error("Error deleting class:", err);
    const errorJson = JSON.stringify({ error: "Internal Server Error" });
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};
