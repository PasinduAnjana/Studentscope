const pool = require("../db"); // your existing pool

const crypto = require("crypto");

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
}

async function createStudent({ index_number, name, email, age, class_id }) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword("123", salt); // default password

  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id`,
    [index_number, hashedPassword, salt]
  );

  const userId = userResult.rows[0].id;

  const studentResult = await pool.query(
    `INSERT INTO students (user_id, index_number, name, email, age, class_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, index_number, name, email, age, class_id]
  );

  return studentResult.rows[0];
}

async function getAllClasses() {
  const result = await pool.query("SELECT id, name,grade FROM classes");
  return result.rows;
}

module.exports = {
  createStudent,
  getAllClasses, // <-- export it here!
};
