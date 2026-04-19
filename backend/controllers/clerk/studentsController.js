const clerkService = require("../../services/clerkService");
const auditService = require("../../services/auditService");

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await clerkService.getAllStudents();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};

// Get student by ID
exports.getStudentById = async (req, res) => {
  try {
    const id = req.url.split("/").pop();
    const student = await clerkService.getStudentById(id);
    if (!student) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student not found" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(student));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch student" }));
  }
};

// Create student
exports.createStudent = async (req, res) => {
  try {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const {
          full_name,
          username,
          password,
          birthday,
          address,
          gender,
          nationality,
          class_id,
          parent_name,
          parent_address,
        } = data;

        if (!full_name || !username || !class_id) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              error: "Full name, username, and class are required",
            })
          );
        }

        const newStudent = await clerkService.createStudent({
          full_name,
          username,
          password,
          birthday,
          address,
          gender,
          nationality,
          class_id,
          parent_name,
          parent_address,
        });

        if (req.user && req.user.userId) {
          await auditService.logAction(req.user.userId, "create", "student", newStudent.id, null, {
            full_name,
            username,
            class_id
          });
        }

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Student created successfully",
            student: newStudent,
          })
        );
      } catch (err) {
        console.error("Error creating student:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  } catch (err) {
    console.error("Error in createStudent handler:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const id = req.url.split("/").pop();
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const oldStudent = await clerkService.getStudentById(id);
        if (!oldStudent) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Student not found" }));
        }

        const oldValues = {
          full_name: oldStudent.full_name,
          username: oldStudent.username,
          class_id: oldStudent.class_id,
          address: oldStudent.address,
          birthday: oldStudent.birthday
        };

        const data = JSON.parse(body);
        const updatedStudent = await clerkService.updateStudent(id, data);

        if (req.user && req.user.userId) {
          await auditService.logAction(req.user.userId, "update", "student", id, oldValues, {
            full_name: data.full_name || oldValues.full_name,
            username: data.username || oldValues.username,
            class_id: data.class_id || oldValues.class_id,
            address: data.address || oldValues.address
          });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Student updated successfully",
            student: updatedStudent,
          })
        );
      } catch (err) {
        console.error("Error updating student:", err);
        if (err.message === "Student not found") {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Student not found" }));
        }
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  } catch (err) {
    console.error("Error in updateStudent handler:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const id = req.url.split("/").pop();
    const oldStudent = await clerkService.getStudentById(id);

    if (oldStudent && req.user && req.user.userId) {
      await auditService.logAction(req.user.userId, "delete", "student", id, {
        full_name: oldStudent.full_name,
        username: oldStudent.username
      }, null);
    }

    await clerkService.deleteStudent(id);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Student deleted successfully" }));
  } catch (err) {
    console.error("Error deleting student:", err);
    if (err.message === "Student not found") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student not found" }));
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};
