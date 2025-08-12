const clerkService = require("../../services/clerkService");

exports.addStudent = async (req, res) => {
  try {
    let body = "";

    // Collect the incoming data
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // When data is fully received
    req.on("end", async () => {
      try {
        const { index_number, name, email, age, class_id } = JSON.parse(body);

        if (!index_number || !name || !email || !age || !class_id) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "All fields are required" }));
        }

        const newStudent = await clerkService.createStudent({
          index_number,
          name,
          email,
          age,
          class_id,
        });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Student added successfully",
            student: newStudent,
          })
        );
      } catch (err) {
        console.error("Error adding student:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  } catch (err) {
    console.error("Error in addStudent handler:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};
