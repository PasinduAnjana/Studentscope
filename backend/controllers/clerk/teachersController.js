const clerkService = require("../../services/clerkService");
const auditService = require("../../services/auditService");

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await clerkService.getAllTeachers();

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

exports.getTeacherById = async (req, res) => {
  try {
    const urlParts = req.url.split("/");
    const teacherId = parseInt(urlParts[urlParts.length - 1]);

    if (isNaN(teacherId)) {
      const errorJson = JSON.stringify({ error: "Invalid teacher ID" });
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    const teacher = await clerkService.getTeacherById(teacherId);

    if (!teacher) {
      const errorJson = JSON.stringify({ error: "Teacher not found" });
      res.writeHead(404, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    const json = JSON.stringify(teacher);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  } catch (err) {
    console.error("Error fetching teacher:", err);

    const errorJson = JSON.stringify({ error: "Internal Server Error" });

    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.createTeacher = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const teacherData = JSON.parse(body);

        const teacher = await clerkService.createTeacher(teacherData);

        if (req.user && req.user.userId) {
          await auditService.logAction(req.user.userId, "create", "teacher", teacher.teacher_id, null, {
            full_name: teacherData.full_name,
            nic: teacherData.nic
          });
        } else {
          console.log("[AUDIT DEBUG] req.user is missing!");
        }

        const json = JSON.stringify(teacher);

        res.writeHead(201, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(json),
        });
        res.end(json);
      } catch (err) {
        console.error("Error creating teacher:", err);

        const errorJson = JSON.stringify({
          error: err.message || "Internal Server Error",
        });

        res.writeHead(500, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(errorJson),
        });
        res.end(errorJson);
      }
    });
  } catch (err) {
    console.error("Error parsing request:", err);

    const errorJson = JSON.stringify({ error: "Bad Request" });

    res.writeHead(400, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const urlParts = req.url.split("/");
    const teacherId = parseInt(urlParts[urlParts.length - 1]);

    if (isNaN(teacherId)) {
      const errorJson = JSON.stringify({ error: "Invalid teacher ID" });
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const oldTeacher = await clerkService.getTeacherById(teacherId);
        if (!oldTeacher) {
          const errorJson = JSON.stringify({ error: "Teacher not found" });
          res.writeHead(404, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(errorJson),
          });
          res.end(errorJson);
          return;
        }

        const oldValues = {
          full_name: oldTeacher.full_name,
          nic: oldTeacher.nic
        };

        const teacherData = JSON.parse(body);

        const teacher = await clerkService.updateTeacher(
          teacherId,
          teacherData
        );

        if (req.user && req.user.userId) {
          await auditService.logAction(req.user.userId, "update", "teacher", teacherId, oldValues, {
            full_name: teacherData.full_name || oldValues.full_name,
            nic: teacherData.nic || oldValues.nic
          });
        }

        const json = JSON.stringify(teacher);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(json),
        });
        res.end(json);
      } catch (err) {
        console.error("Error updating teacher:", err);

        const errorJson = JSON.stringify({
          error: err.message || "Internal Server Error",
        });

        res.writeHead(500, {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(errorJson),
        });
        res.end(errorJson);
      }
    });
  } catch (err) {
    console.error("Error parsing request:", err);

    const errorJson = JSON.stringify({ error: "Bad Request" });

    res.writeHead(400, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const urlParts = req.url.split("/");
    const teacherId = parseInt(urlParts[urlParts.length - 1]);

    if (isNaN(teacherId)) {
      const errorJson = JSON.stringify({ error: "Invalid teacher ID" });
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    const oldTeacher = await clerkService.getTeacherById(teacherId);

    if (oldTeacher && req.user && req.user.userId) {
      await auditService.logAction(req.user.userId, "delete", "teacher", teacherId, {
        full_name: oldTeacher.full_name,
        nic: oldTeacher.nic
      }, null);
    }

    const success = await clerkService.deleteTeacher(teacherId);

    if (!success) {
      const errorJson = JSON.stringify({ error: "Teacher not found" });
      res.writeHead(404, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(errorJson),
      });
      res.end(errorJson);
      return;
    }

    const json = JSON.stringify({ message: "Teacher deleted successfully" });

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
    });
    res.end(json);
  } catch (err) {
    console.error("Error deleting teacher:", err);

    const errorJson = JSON.stringify({ error: "Internal Server Error" });

    res.writeHead(500, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(errorJson),
    });
    res.end(errorJson);
  }
};
