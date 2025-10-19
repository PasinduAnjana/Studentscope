const clerkService = require("../../services/clerkService");

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
        const data = JSON.parse(body);
        const updatedStudent = await clerkService.updateStudent(id, data);
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
