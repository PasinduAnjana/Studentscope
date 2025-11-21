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

        await clerkService.assignTeacherToClass(grade, class_name, teacher_id);

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

    // Delete the class
    await clerkService.deleteClass(classId);

    const successJson = JSON.stringify({
      message: "Class deleted successfully",
    });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(successJson),
    });
    res.end(successJson);
  } catch (err) {
    console.error("Error deleting class:", err);
    
    let statusCode = 500;
    let errorMessage = "Internal Server Error";

    if (err.message === "Class not found") {
      statusCode = 404;
      errorMessage = err.message;
    } else if (err.message === "Cannot delete class with students assigned") {
      statusCode = 400;
      errorMessage = err.message;
    }

    const errorJson = JSON.stringify({ error: errorMessage });
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await clerkService.getSubjects();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(subjects));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch subjects" }));
  }
};
