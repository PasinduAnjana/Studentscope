const teacherService = require("../../services/teacherService");

exports.getEvents = async (req, res) => {
  try {
    const events = await teacherService.getEvents(req.user.userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(events));
  } catch (err) {
    console.error("Error fetching teacher events:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
};

exports.createEvent = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const data = JSON.parse(body);
      const newEvent = await teacherService.createEvent(data, req.user.userId);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newEvent));
    } catch (err) {
      console.error("Error creating teacher event:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to create event" }));
    }
  });
};

exports.deleteEvent = async (req, res) => {
  const idStr = req.url.split("/").pop();
  const eventId = parseInt(idStr, 10);

  if (isNaN(eventId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid event ID" }));
  }

  try {
    await teacherService.deleteEvent(eventId, req.user.userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Event deleted successfully" }));
  } catch (err) {
    console.error("Error deleting teacher event:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete event" }));
  }
};

exports.updateEvent = async (req, res) => {
  const idStr = req.url.split("/").pop();
  const eventId = parseInt(idStr, 10);

  if (isNaN(eventId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid event ID" }));
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      const data = JSON.parse(body);
      const updatedEvent = await teacherService.updateEvent(eventId, data, req.user.userId);
      if (!updatedEvent) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Event not found or access denied" }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(updatedEvent));
    } catch (err) {
      console.error("Error updating teacher event:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to update event" }));
    }
  });
};
