const teacherService = require("../../services/teacherService");

exports.getAllAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const announcements = await teacherService.getAnnouncementsByTeacher(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch announcements" }));
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { title, description, audience_type, class_ids } =
          JSON.parse(body);

        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        const announcement = await teacherService.createAnnouncement({
          title,
          description,
          audience_type: "students",
          class_ids: [],
          teacher_id: userId,
        });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(announcement));
      } catch (err) {
        console.error("Error creating announcement:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to create announcement" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to create announcement" }));
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const urlParts = req.url.split("/");
    const announcementId = urlParts[urlParts.length - 1];

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { title, description } = JSON.parse(body);

        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        const announcement = await teacherService.updateAnnouncement(
          announcementId,
          {
            title,
            description,
          },
          userId
        );

        if (!announcement) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Announcement not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(announcement));
      } catch (err) {
        console.error("Error updating announcement:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to update announcement" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to update announcement" }));
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const urlParts = req.url.split("/");
    const announcementId = urlParts[urlParts.length - 1];

    const success = await teacherService.deleteAnnouncement(
      announcementId,
      userId
    );

    if (!success) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Announcement not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Announcement deleted successfully" }));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete announcement" }));
  }
};

exports.getAnnouncementsForTeacher = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const announcements = await teacherService.getAnnouncementsForTeacher(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch announcements" }));
  }
};
