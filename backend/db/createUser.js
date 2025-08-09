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

  const result = await pool.query(
    "INSERT INTO users (username, password, salt, role) VALUES ($1, $2, $3, $4) RETURNING id",
    [username, hashedPassword, salt, role]
  );
  console.log(`✅ Created user: ${username} (${role})`);
  return result.rows[0].id;
}

async function run() {
  try {
    // Create users
    const adminId = await createUser("admin", "123", "admin");
    const teacherId = await createUser("teacher", "123", "teacher");
    const studentId = await createUser("student", "123", "student");
    const clerkId = await createUser("clerk", "123", "clerk");

    // Insert teacher
    const teacherRes = await pool.query(
      "INSERT INTO teachers (user_id, name, email) VALUES ($1, $2, $3) RETURNING id",
      [teacherId, "John Smith", "john.smith@school.com"]
    );
    const teacherRowId = teacherRes.rows[0].id;

    // Insert class
    const classRes = await pool.query(
      "INSERT INTO classes (name, class_teacher_id) VALUES ($1, $2) RETURNING id",
      ["Grade 10 - A", teacherRowId]
    );
    const classId = classRes.rows[0].id;

    // Insert student
    await pool.query(
      "INSERT INTO students (user_id, name, email, age, grade, class_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        studentId,
        "Alice Brown",
        "alice.brown@student.com",
        15,
        "Grade 10",
        classId,
      ]
    );

    // Insert subjects
    const subjectNames = [
      ["Mathematics", "MATH"],
      ["Science", "SCI"],
      ["ICT", "ICT"],
      ["English", "ENG"],
      ["History", "HIS"],
      ["Geography", "GEO"],
      ["Art", "ART"],
      ["Physical Education", "PE"],
    ];

    const subjectIds = [];
    for (const [name, code] of subjectNames) {
      const subjRes = await pool.query(
        "INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING id",
        [name, code]
      );
      subjectIds.push(subjRes.rows[0].id);
    }

    // Insert timetable (8 periods per weekday)
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    let subjIndex = 0;
    for (const day of days) {
      for (let period = 1; period <= 8; period++) {
        const subjId = subjectIds[subjIndex % subjectIds.length];
        await pool.query(
          "INSERT INTO timetables (day_of_week, period_number, subject_id, teacher_id, class_id) VALUES ($1, $2, $3, $4, $5)",
          [day, period, subjId, teacherRowId, classId]
        );
        subjIndex++;
      }
    }

    console.log("✅ Sample data inserted successfully");
  } catch (err) {
    console.error("❌ Error inserting data:", err.message);
  } finally {
    await pool.end();
  }
}

run();
