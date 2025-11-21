const authService = require("../../services/authService");
const clerkService = require("../../services/clerkService");
const pool = require("../../db");

exports.getProfile = async (req, res) => {
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

    // Get clerk details from clerk_details table
    let details = null;
    try {
      details = await clerkService.getClerkDetails(session.userId);
    } catch (err) {
      // If table doesn't exist or other error, continue without details
      console.log("No clerk details found");
    }

    // Return clerk profile information
    const profile = {
      id: session.userId,
      username: session.username,
      role: session.role,
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

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await clerkService.approvePasswordReset(
      resetId,
      session.userId
    );

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

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await clerkService.rejectPasswordReset(
      resetId,
      session.userId
    );

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
