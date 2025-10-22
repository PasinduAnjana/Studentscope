const teacherService = require("../../services/teacherService");

exports.getAllTodos = async (req, res) => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const todos = await teacherService.getTeacherTodos(teacherId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
  } catch (err) {
    console.error("Error fetching todos:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch todos" }));
  }
};

exports.createTodo = async (req, res) => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(body);

        if (!text || text.trim() === "") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Todo text is required" }));
          return;
        }

        const todo = await teacherService.createTodo(teacherId, text);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(todo));
      } catch (err) {
        console.error("Error creating todo:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to create todo" }));
      }
    });
  } catch (err) {
    console.error("Error in createTodo:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to create todo" }));
  }
};

exports.updateTodo = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const todoId = parseInt(req.url.split("/").pop());

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { text } = JSON.parse(body);

        if (!text || text.trim() === "") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Todo text is required" }));
          return;
        }

        const todo = await teacherService.updateTodo(todoId, teacherId, text);

        if (!todo) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Todo not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(todo));
      } catch (err) {
        console.error("Error updating todo:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to update todo" }));
      }
    });
  } catch (err) {
    console.error("Error in updateTodo:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to update todo" }));
  }
};

exports.deleteTodo = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    const todoId = parseInt(req.url.split("/").pop());

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const result = await teacherService.deleteTodo(todoId, teacherId);

    if (!result) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Todo not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Todo deleted successfully" }));
  } catch (err) {
    console.error("Error deleting todo:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete todo" }));
  }
};

exports.updateTodoStatus = async (req, res) => {
  try {
    const teacherId = req.user?.userId;
    // URL format: /api/teacher/todos/{id}/status
    // Split and get the second-to-last element (the ID before "/status")
    const urlParts = req.url.split("/");
    const todoId = parseInt(urlParts[urlParts.length - 2]);

    if (!teacherId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (isNaN(todoId)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid todo ID" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { status } = JSON.parse(body);

        if (!status || !["pending", "completed"].includes(status)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Invalid status. Must be 'pending' or 'completed'",
            })
          );
          return;
        }

        const todo = await teacherService.updateTodoStatus(
          todoId,
          teacherId,
          status
        );

        if (!todo) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Todo not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(todo));
      } catch (err) {
        console.error("Error updating todo status:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to update todo status" }));
      }
    });
  } catch (err) {
    console.error("Error in updateTodoStatus:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to update todo status" }));
  }
};
