const crypto = require("crypto");
const pool = require("../db");

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST)
    .toString("hex");
}

async function createUser(username, rawPassword, role) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(rawPassword, salt);

  try {
    await pool.query(
      "INSERT INTO users (username, password, salt, role) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, salt, role]
    );
    console.log(`✅ Created user: ${username} (${role})`);
  } catch (err) {
    console.error(`❌ Error inserting user ${username}:`, err.message);
  }
}

async function run() {
  await createUser("admin", "123", "admin");
  await createUser("teacher", "123", "teacher");
  await createUser("student", "123", "student");
  await createUser("clerk", "123", "clerk");

  await pool.end(); // ✅ only once
}

run();
