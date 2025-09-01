const pool = require("../db");
const crypto = require("crypto");

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

exports.authenticate = async (username, password) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    const hashedInput = hashPassword(password, user.salt);

    return hashedInput === user.password ? user : null;
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
};

exports.createSession = async (user) => {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await pool.query(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
      [sessionToken, user.id, expiresAt]
    );

    return sessionToken;
  } catch (err) {
    console.error("Error creating session:", err);
    return null;
  }
};

exports.getSession = async (sessionToken) => {
  try {
    const result = await pool.query(
      `
      SELECT s.token, s.user_id, s.expires_at, u.username, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `,
      [sessionToken]
    );

    if (result.rows.length === 0) {
      // Clean up expired session if it exists
      await pool.query("DELETE FROM sessions WHERE token = $1", [sessionToken]);
      return null;
    }

    const session = result.rows[0];
    return {
      userId: session.user_id,
      username: session.username,
      role: session.role,
      expiresAt: session.expires_at,
    };
  } catch (err) {
    console.error("Error getting session:", err);
    return null;
  }
};

exports.destroySession = async (sessionToken) => {
  try {
    await pool.query("DELETE FROM sessions WHERE token = $1", [sessionToken]);
  } catch (err) {
    console.error("Error destroying session:", err);
  }
};

exports.cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query(
      "DELETE FROM sessions WHERE expires_at <= NOW()"
    );
    console.log(`Cleaned up ${result.rowCount} expired sessions`);
  } catch (err) {
    console.error("Error cleaning up sessions:", err);
  }
};

exports.createUser = async (username, rawPassword, role) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(rawPassword, salt);

  await pool.query(
    "INSERT INTO users (username, password, salt, role) VALUES ($1, $2, $3, $4)",
    [username, hashedPassword, salt, role]
  );
};

exports.getUsernameById = async (userId) => {
  try {
    const result = await pool.query(
      "SELECT username FROM users WHERE id = $1",
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].username : null;
  } catch (err) {
    console.error("Error getting username:", err);
    return null;
  }
};
