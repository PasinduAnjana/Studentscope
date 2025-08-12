const crypto = require("crypto");
const pool = require(".");
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

async function createStudent(indexNumber, name, email, age, classId) {
  // Create linked user with default password
  const userId = await createUser(indexNumber, "123", "student");

  await pool.query(
    `INSERT INTO students (user_id, index_number, name, email, age, class_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, indexNumber, name, email, age, classId]
  );

  console.log(`🎓 Created student: ${name} (${indexNumber})`);
}

async function run() {
  try {
    // Create base users
    const adminId = await createUser("admin", "123", "admin");
    const teacherUserId = await createUser("teacher", "123", "teacher");
    const clerkId = await createUser("clerk", "123", "clerk");

    // Insert teacher
    const teacherRes = await pool.query(
      "INSERT INTO teachers (user_id, name, email) VALUES ($1, $2, $3) RETURNING id",
      [teacherUserId, "Pasindu Anjana", "pasindu@school.com"]
    );
    const teacherId = teacherRes.rows[0].id;

    // Insert class
    const classRes = await pool.query(
      "INSERT INTO classes (name, grade, class_teacher_id) VALUES ($1, $2, $3) RETURNING id",
      ["Grade 10 - A", "Grade 10", teacherId]
    );
    const classId = classRes.rows[0].id;

    // Insert student with index number
    await createStudent(
      "S1001",
      "Alice Brown",
      "alice.brown@student.com",
      15,
      classId
    );

    // Insert subjects
    const subjects = [
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
    for (const [name, code] of subjects) {
      const res = await pool.query(
        "INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING id",
        [name, code]
      );
      subjectIds.push(res.rows[0].id);
    }

    // Teacher-Class-Subject mappings
    for (const subjectId of subjectIds) {
      await pool.query(
        "INSERT INTO teacher_class_subject (teacher_id, class_id, subject_id) VALUES ($1, $2, $3)",
        [teacherId, classId, subjectId]
      );
    }

    // Timetable (8 periods × weekdays)
    const tcsRes = await pool.query(
      "SELECT id FROM teacher_class_subject WHERE teacher_id = $1 AND class_id = $2",
      [teacherId, classId]
    );
    const tcsIds = tcsRes.rows.map((row) => row.id);

    let index = 0;
    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 8; period++) {
        const tcsId = tcsIds[index % tcsIds.length];
        await pool.query(
          `INSERT INTO timetables (day_of_week, period_number, teacher_class_subject_id)
           VALUES ($1, $2, $3)`,
          [day, period, tcsId]
        );
        index++;
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
