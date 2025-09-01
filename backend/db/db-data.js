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

async function createUser(
  username,
  rawPassword,
  roleName,
  classId = null,
  isClassTeacher = false
) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(rawPassword, salt);

  // Get role_id
  const roleRes = await pool.query("SELECT id FROM roles WHERE name = $1", [
    roleName,
  ]);
  if (!roleRes.rows.length) throw new Error(`Role "${roleName}" not found`);
  const roleId = roleRes.rows[0].id;

  const res = await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id, is_class_teacher)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [username, hashedPassword, salt, roleId, classId, isClassTeacher]
  );

  return res.rows[0].id;
}

async function run() {
  try {
    console.log("⏳ Seeding database...");

    // 1️⃣ Roles
    const roles = ["admin", "teacher", "student", "clerk"];
    for (const role of roles) {
      await pool.query(
        `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [role]
      );
    }

    // 2️⃣ Class
    const classRes = await pool.query(
      `INSERT INTO classes (name, grade) VALUES ($1, $2) RETURNING id`,
      ["Grade 10 - A", 10]
    );
    const classId = classRes.rows[0].id;

    // 3️⃣ Users
    const adminId = await createUser("admin", "123", "admin");
    const teacherId = await createUser(
      "teacher",
      "123",
      "teacher",
      classId,
      true
    );
    const clerkId = await createUser("clerk", "123", "clerk");
    const studentId = await createUser("alice", "123", "student", classId);

    // 4️⃣ Class teacher mapping
    await pool.query(
      `INSERT INTO class_teachers (teacher_id, class_id) VALUES ($1, $2)`,
      [teacherId, classId]
    );

    // 5️⃣ Subjects
    const subjects = [
      "Mathematics",
      "Science",
      "ICT",
      "English",
      "History",
      "Geography",
      "Art",
      "Physical Education",
    ];
    const subjectIds = [];
    for (const name of subjects) {
      const res = await pool.query(
        "INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id",
        [name]
      );
      if (res.rows.length) subjectIds.push(res.rows[0].id);
      else {
        const existing = await pool.query(
          "SELECT id FROM subjects WHERE name = $1",
          [name]
        );
        subjectIds.push(existing.rows[0].id);
      }
    }

    // 6️⃣ Teacher-Subjects
    for (const subjectId of subjectIds) {
      await pool.query(
        "INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)",
        [teacherId, subjectId, classId]
      );
    }

    // 7️⃣ Timetable (5 days x 8 slots)
    let idx = 0;
    for (let day = 1; day <= 5; day++) {
      for (let slot = 1; slot <= 8; slot++) {
        const subjectId = subjectIds[idx % subjectIds.length];
        await pool.query(
          `INSERT INTO timetables (class_id, subject_id, teacher_id, day_of_week, slot)
           VALUES ($1, $2, $3, $4, $5)`,
          [classId, subjectId, teacherId, day, slot]
        );
        idx++;
      }
    }

    // 8️⃣ Exam + Marks
    const examRes = await pool.query(
      "INSERT INTO exams (name, year) VALUES ($1, $2) RETURNING id",
      ["Mid Term", 2025]
    );
    const examId = examRes.rows[0].id;

    for (const subjectId of subjectIds) {
      await pool.query(
        "INSERT INTO marks (student_id, subject_id, marks, exam_id) VALUES ($1, $2, $3, $4)",
        [studentId, subjectId, Math.floor(Math.random() * 40) + 60, examId]
      );
    }

    // 9️⃣ Attendance
    await pool.query(
      "INSERT INTO attendance (student_id, class_id, date, status) VALUES ($1, $2, $3, $4)",
      [studentId, classId, new Date(), true]
    );

    // 🔟 Notices
    await pool.query(
      "INSERT INTO notices (title, content, posted_by, audience) VALUES ($1, $2, $3, $4)",
      ["Welcome", "Welcome to the new school year!", adminId, "all"]
    );

    // 11️⃣ Achievements
    await pool.query(
      "INSERT INTO achievements (student_id, description, achieved_at) VALUES ($1, $2, $3)",
      [studentId, "Won 1st place in Science Fair", new Date()]
    );

    console.log("🎉 Database seeded successfully!");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await pool.end();
  }
}

run();
