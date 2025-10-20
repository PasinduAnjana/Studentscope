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
      const detailsRes = await pool.query(
        `SELECT full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, birthday
         FROM clerk_details WHERE clerk_id = $1`,
        [session.userId]
      );
      if (detailsRes.rows.length > 0) {
        details = detailsRes.rows[0];
      }
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
