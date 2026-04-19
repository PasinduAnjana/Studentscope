const clerkService = require("../../services/clerkService");
const auditService = require("../../services/auditService");

exports.getEvents = async (req, res) => {
  try {
    const events = await clerkService.getEvents();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(events));
  } catch (err) {
    console.error("Error fetching events:", err);
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
      const newEvent = await clerkService.createEvent(data, req.user.userId);

      try {
        if (req.user?.userId) {
          await auditService.logAction(req.user.userId, "create", "event", newEvent.id, null, {
            title: data.title,
            date: data.date
          });
        }
      } catch (auditErr) {
        console.error("Audit log failed:", auditErr);
      }

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(newEvent));
    } catch (err) {
      console.error("Error creating event:", err);
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
    const deleted = await clerkService.deleteEvent(eventId, req.user.userId);

    try {
      if (req.user?.userId) {
        await auditService.logAction(req.user.userId, "delete", "event", eventId, null, null);
      }
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    if (!deleted) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Event not found or unauthorized" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Event deleted successfully" }));
  } catch (err) {
    console.error("Error deleting event:", err);
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
      const updatedEvent = await clerkService.updateEvent(eventId, data, req.user.userId);
      if (!updatedEvent) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Event not found or unauthorized" }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(updatedEvent));
    } catch (err) {
      console.error("Error updating event:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to update event" }));
    }
  });
};
