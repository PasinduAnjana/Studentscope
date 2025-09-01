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

// Create a student user
async function createStudent({ index_number, name, class_id }) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword("123", salt); // default password

  // Get role_id for student
  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE name = 'student'"
  );
  if (!roleRes.rows.length) throw new Error("Role 'student' not found");
  const roleId = roleRes.rows[0].id;

  // Insert into users table
  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username AS name, class_id`,
    [index_number, hashedPassword, salt, roleId, class_id]
  );

  const user = userResult.rows[0];

  // Map to previous returning format
  return {
    id: user.id,
    name: name || user.name, // optional: override username with real name
    email: null, // no email in new schema
    age: null, // no age in new schema
    class_id: user.class_id,
    class_name: null, // you can populate this if needed
    grade: null,
  };
}

// Get all classes
async function getAllClasses() {
  const result = await pool.query("SELECT id, name, grade FROM classes");
  return result.rows;
}

module.exports = {
  createStudent,
  getAllClasses,
};
