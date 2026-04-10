const clerkService = require("../../services/clerkService");

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let details = null;
    try {
      details = await clerkService.getClerkDetails(userId);
    } catch (err) {
      console.log("No clerk details found");
    }

    const profile = {
      id: userId,
      username: req.user.username,
      role: req.user.role,
      details: details,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(profile));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch profile" }));
  }
};

exports.getPendingPasswordResets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resets = await clerkService.getPendingPasswordResets();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resets));
  } catch (err) {
    console.error("Error getting pending password resets:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to get pending password resets" }));
  }
};

exports.approvePasswordReset = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await clerkService.approvePasswordReset(resetId, userId);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Password reset approved" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: result.error }));
    }
  } catch (err) {
    console.error("Error approving password reset:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to approve password reset" }));
  }
};

exports.rejectPasswordReset = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await clerkService.rejectPasswordReset(resetId, userId);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Password reset rejected" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: result.error }));
    }
  } catch (err) {
    console.error("Error rejecting password reset:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to reject password reset" }));
  }
};
