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
    const result = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (!result.rows.length) return null;

    const user = result.rows[0];
    const hashedInput = hashPassword(password, user.salt);

    if (hashedInput !== user.password) return null;

    // return safe user object
    return {
      id: user.id,
      username: user.username,
      role: user.role_name,
      class_id: user.class_id,
      is_class_teacher: user.is_class_teacher,
    };
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
      SELECT s.token, s.user_id, s.expires_at, u.username, r.name AS role, u.class_id, u.is_class_teacher, c.name AS class_name, c.grade AS class_grade
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN classes c ON u.class_id = c.id
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
      class_id: session.class_id,
      is_class_teacher: session.is_class_teacher,
      class_name: session.class_name,
      class_grade: session.class_grade,
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

exports.createUser = async (
  username,
  rawPassword,
  roleName,
  classId = null,
  isClassTeacher = false
) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(rawPassword, salt);

  // Get role_id from roles table
  const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [
    roleName,
  ]);
  if (roleRes.rows.length === 0) {
    throw new Error(`Role "${roleName}" not found`);
  }
  const roleId = roleRes.rows[0].id;

  await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id, is_class_teacher)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [username, hashedPassword, salt, roleId, classId, isClassTeacher]
  );

  console.log(`✅ Created user: ${username} (${roleName})`);
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

exports.verifyUser = async (username, role) => {
  try {
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      [role]
    );

    if (roleResult.rows.length === 0) return null;

    const result = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND role_id = $2",
      [username, roleResult.rows[0].id]
    );

    return result.rows.length > 0;
  } catch (err) {
    console.error("Error verifying user:", err);
    return null;
  }
};

exports.requestPasswordReset = async (username, role, newPassword) => {
  try {
    // Get role ID
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      [role]
    );
    if (roleResult.rows.length === 0) {
      return { success: false, error: "Role not found" };
    }

    // Get user
    const userResult = await pool.query(
      "SELECT id FROM users WHERE username = $1 AND role_id = $2",
      [username, roleResult.rows[0].id]
    );

    if (userResult.rows.length === 0) {
      return { success: false, error: "User not found" };
    }

    const userId = userResult.rows[0].id;
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // For all roles, hash and store the new password
    if (newPassword) {
      const salt = crypto.randomBytes(16).toString("hex");
      const hashedPassword = hashPassword(newPassword, salt);

      // Create reset request with password
      await pool.query(
        `INSERT INTO password_reset_requests (user_id, role, reset_token, new_password, new_salt, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, role, resetToken, hashedPassword, salt, expiresAt, "pending"]
      );
    } else {
      // Fallback: create request without password (if no password provided)
      await pool.query(
        `INSERT INTO password_reset_requests (user_id, role, reset_token, expires_at, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, role, resetToken, expiresAt, "pending"]
      );
    }

    return { success: true, message: "Password reset request created" };
  } catch (err) {
    console.error("Error creating password reset request:", err);
    return { success: false, error: "Failed to create reset request" };
  }
};
