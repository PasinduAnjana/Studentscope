const clerkService = require("../../services/clerkService");
const authService = require("../../services/authService");

exports.getAllAnnouncements = async (req, res) => {
  try {
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    // Get all announcements created by this clerk
    const announcements = await clerkService.getAllAnnouncements(
      session.userId
    );
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
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { title, description, audience_type, teacher_ids, class_ids } =
          JSON.parse(body);
        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        if (
          !audience_type ||
          !["all", "teachers", "students"].includes(audience_type)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Valid audience_type is required" }));
          return;
        }

        // Validate selections based on audience type
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

        const announcement = await clerkService.createAnnouncement({
          title,
          description,
          audience_type,
          teacher_ids: teacher_ids || [],
          class_ids: class_ids || [],
          clerk_id: session.userId,
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
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    const urlParts = req.url.split("/");
    const announcementId = urlParts[urlParts.length - 1];

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { title, description, audience_type, teacher_ids, class_ids } =
          JSON.parse(body);

        if (!title || !description) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Title and description are required" })
          );
          return;
        }

        if (
          !audience_type ||
          !["all", "teachers", "students"].includes(audience_type)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Valid audience_type is required" }));
          return;
        }

        // Validate selections based on audience type
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

        const announcement = await clerkService.updateAnnouncement(
          announcementId,
          {
            title,
            description,
            audience_type,
            teacher_ids: teacher_ids || [],
            class_ids: class_ids || [],
          },
          session.userId
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
    // Get current user from session
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    const sessionToken = match ? match[1] : null;

    if (!sessionToken) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No session token" }));
      return;
    }

    const session = await authService.getSession(sessionToken);

    if (!session) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or expired session" }));
      return;
    }

    const urlParts = req.url.split("/");
    const announcementId = urlParts[urlParts.length - 1];

    const success = await clerkService.deleteAnnouncement(
      announcementId,
      session.userId
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
    if (err.message.includes("access denied")) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Access denied" }));
    } else {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to delete announcement" }));
    }
  }
};
