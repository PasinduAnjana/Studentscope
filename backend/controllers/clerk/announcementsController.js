const clerkService = require("../../services/clerkService");
const auditService = require("../../services/auditService");

exports.getAllAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const urlParts = req.url.split("?");
    const queryString = urlParts[1] || "";
    const queryParams = new URLSearchParams(queryString);
    const role = queryParams.get("role");

    let announcements;
    if (role === "clerk") {
      announcements = await clerkService.getAnnouncementsForClerk(userId);
    } else {
      announcements = await clerkService.getAllAnnouncements(userId);
    }

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
        const {
          title,
          description,
          audience_type,
          teacher_ids,
          class_ids,
          clerk_ids,
        } = JSON.parse(body);
        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        if (
          !audience_type ||
          !["all", "teachers", "students", "clerks", "all-teachers"].includes(
            audience_type
          )
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Valid audience_type is required" }));
          return;
        }

        if (
          audience_type === "teachers" &&
          (!teacher_ids || teacher_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Teacher selection is required for teachers audience",
            })
          );
          return;
        }

        if (
          audience_type === "students" &&
          (!class_ids || class_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Class selection is required for students audience",
            })
          );
          return;
        }

        if (
          audience_type === "clerks" &&
          (!clerk_ids || clerk_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Clerk selection is required for clerks audience",
            })
          );
          return;
        }

        const announcement = await clerkService.createAnnouncement({
          title,
          description,
          audience_type,
          teacher_ids: teacher_ids || [],
          class_ids: class_ids || [],
          clerk_ids: clerk_ids || [],
          clerk_id: userId,
        });

        try {
          if (userId) {
            await auditService.logAction(userId, "create", "announcement", announcement.id, null, {
              title,
              audience_type
            });
          }
        } catch (auditErr) {
          console.error("Audit log failed:", auditErr);
        }

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
        const {
          title,
          description,
          audience_type,
          teacher_ids,
          class_ids,
          clerk_ids,
        } = JSON.parse(body);

        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        if (
          !audience_type ||
          !["all", "teachers", "students", "clerks", "all-teachers"].includes(
            audience_type
          )
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Valid audience_type is required" }));
          return;
        }

        if (
          audience_type === "teachers" &&
          (!teacher_ids || teacher_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Teacher selection is required for teachers audience",
            })
          );
          return;
        }

        if (
          audience_type === "students" &&
          (!class_ids || class_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Class selection is required for students audience",
            })
          );
          return;
        }

        if (
          audience_type === "clerks" &&
          (!clerk_ids || clerk_ids.length === 0)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Clerk selection is required for clerks audience",
            })
          );
          return;
        }

        const announcement = await clerkService.updateAnnouncement(
          announcementId,
          {
            title,
            description,
            audience_type,
            teacher_ids: teacher_ids || [],
            class_ids: class_ids || [],
            clerk_ids: clerk_ids || [],
          },
          userId
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(announcement));
      } catch (err) {
        console.error("Error updating announcement:", err);
        if (err.message.includes("access denied")) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Access denied" }));
        } else {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to update announcement" }));
        }
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

    const success = await clerkService.deleteAnnouncement(
      announcementId,
      userId
    );

    try {
      if (userId) {
        await auditService.logAction(userId, "delete", "announcement", announcementId, null, null);
      }
    } catch (auditErr) {
      console.error("Audit log failed:", auditErr);
    }

    if (!success) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Announcement not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Announcement deleted successfully" }));
  } catch (err) {
    console.error("Database error:", err);
    if (err.message.includes("access denied")) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Access denied" }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to delete announcement" }));
    }
  }
};

exports.getStaffAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const announcements = await clerkService.getStaffAnnouncements();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch staff announcements" }));
  }
};
