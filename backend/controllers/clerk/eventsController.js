const clerkService = require("../../services/clerkService");

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
    await clerkService.deleteEvent(eventId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Event deleted successfully" }));
  } catch (err) {
    console.error("Error deleting event:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete event" }));
  }
};
