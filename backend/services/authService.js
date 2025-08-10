const pool = require("../db");
const crypto = require("crypto");

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

// Hashing the password
function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
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

// Optional: use this function when registering a user
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
