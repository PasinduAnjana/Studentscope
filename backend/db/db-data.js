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

    // 2️⃣ Classes
    const classes = [
      ["Grade 1", 1],
      ["Grade 6", 6],
      ["Grade 10", 10],
      ["Grade 12", 12],
    ];
    const classIds = {};
    for (const [name, grade] of classes) {
      const res = await pool.query(
        `INSERT INTO classes (name, grade) VALUES ($1, $2) RETURNING id`,
        [name, grade]
      );
      classIds[grade] = res.rows[0].id;
    }

    // 3️⃣ Subjects by grade (compulsory)
    const subjectsByGrade = {
      "1-5": [
        "First Language",
        "English Language",
        "Mathematics",
        "Environmental Studies",
        "Religion",
        "Aesthetic Education",
        "Physical Education",
      ],
      "6-9": [
        "First Language",
        "English Language",
        "Mathematics",
        "Science",
        "History",
        "Religion",
        "Civics",
        "Health & Physical Education",
        "Aesthetic Education",
      ],
      "10-11": [
        "First Language",
        "English Language",
        "Mathematics",
        "Science",
        "Religion",
        "History",
      ],
      "12-13": ["General English", "Common General Test"],
    };

    // Electives
    const studentElectives = {
      "6-9": [
        "Practical and Technical Skills",
        "Drama",
        "Dance",
        "Art",
        "Music",
      ],
      "10-11": [
        "Business & Accounting Studies",
        "Geography",
        "Civic Education",
        "Agriculture & Food Technology",
        "ICT",
        "Health & Physical Education",
        "Aesthetic Subjects",
        "Home Science",
        "Technical Subjects",
      ],
      "12-13": [
        "Physics",
        "Chemistry",
        "Biology",
        "Combined Mathematics",
        "ICT",
        "Business Studies",
        "Accounting",
        "Economics",
        "History",
        "Political Science",
        "Sinhala Literature",
        "Tamil Literature",
        "English Literature",
        "Geography",
        "Logic",
        "Religion",
        "Performing Arts",
        "Engineering Technology",
        "Bio-System Technology",
        "Science for Technology",
      ],
    };

    // 4️⃣ Insert all subjects (deduplicated)
    const subjectIdsMap = {};
    const allSubjects = new Set();
    Object.values(subjectsByGrade).forEach((arr) =>
      arr.forEach((s) => allSubjects.add(s))
    );
    Object.values(studentElectives).forEach((arr) =>
      arr.forEach((s) => allSubjects.add(s))
    );

    for (const name of allSubjects) {
      const res = await pool.query(
        `INSERT INTO subjects (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [name]
      );
      let id;
      if (res.rows.length) id = res.rows[0].id;
      else {
        const existing = await pool.query(
          "SELECT id FROM subjects WHERE name=$1",
          [name]
        );
        id = existing.rows[0].id;
      }
      subjectIdsMap[name] = id;
    }

    // 5️⃣ Class subjects (mandatory)
    const classSubjectsMapping = {
      1: subjectsByGrade["1-5"],
      6: subjectsByGrade["6-9"],
      10: subjectsByGrade["10-11"],
      12: subjectsByGrade["12-13"],
    };

    for (const grade in classSubjectsMapping) {
      const classId = classIds[grade];
      const subjects = classSubjectsMapping[grade];
      for (let i = 0; i < subjects.length; i++) {
        const subId = subjectIdsMap[subjects[i]];
        await pool.query(
          `INSERT INTO class_subjects (class_id, subject_id, is_common, display_order)
           VALUES ($1, $2, true, $3)`,
          [classId, subId, i + 1]
        );
      }
    }

    // 6️⃣ Grade subject rules (elective counts)
    const gradeRules = [
      [1, 0],
      [6, 1],
      [10, 3],
      [12, 3],
    ];
    for (const [grade, electiveCount] of gradeRules) {
      await pool.query(
        `INSERT INTO grade_subject_rules (grade, elective_count) VALUES ($1, $2)`,
        [grade, electiveCount]
      );
    }

    // 7️⃣ Insert elective subjects into grade_subjects
    const electiveMapping = {
      6: studentElectives["6-9"],
      10: studentElectives["10-11"],
      12: studentElectives["12-13"],
    };
    for (const grade in electiveMapping) {
      const electives = electiveMapping[grade];
      for (let i = 0; i < electives.length; i++) {
        const subId = subjectIdsMap[electives[i]];
        await pool.query(
          `INSERT INTO grade_subjects (grade, subject_id, type, display_order)
           VALUES ($1, $2, 'elective', $3)`,
          [grade, subId, i + 1]
        );
      }
    }

    // 8️⃣ Users
    const adminId = await createUser("admin", "123", "admin");
    const clerkId = await createUser("clerk", "123", "clerk");

    const teacherIds = {};
    for (const grade of [1, 6, 10, 12]) {
      const tId = await createUser(
        `teacher${grade}`,
        "123",
        "teacher",
        classIds[grade],
        true
      );
      teacherIds[grade] = tId;
      await pool.query(
        `INSERT INTO class_teachers (teacher_id, class_id) VALUES ($1,$2)`,
        [tId, classIds[grade]]
      );
    }

    // 9️⃣ Students
    const studentsByClass = {
      1: ["Amal", "Kamal", "Nimal", "Sunil", "Anusha"],
      6: ["Sajith", "Ishara", "Dilshan", "Hashini", "Ruwan"],
      10: ["Chathura", "Lakshan", "Shanika", "Thilina", "Manori"],
      12: ["Dinusha", "Gayathri", "Pasindu", "Sandeepa", "Isuru"],
    };
    const studentIds = {};
    for (const grade in studentsByClass) {
      studentIds[grade] = [];
      for (const uname of studentsByClass[grade]) {
        const sId = await createUser(uname, "123", "student", classIds[grade]);
        studentIds[grade].push(sId);
      }
    }

    // 🔟 Teacher-Subjects mapping (teachers cover compulsory subjects)
    for (const grade in teacherIds) {
      const tId = teacherIds[grade];
      const classId = classIds[grade];
      const subjects = classSubjectsMapping[grade];
      for (const subName of subjects) {
        await pool.query(
          `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES ($1,$2,$3)`,
          [tId, subjectIdsMap[subName], classId]
        );
      }
    }

    // 1️⃣1️⃣ Assign elective subjects to students
    const assignElectives = [
      [6, 1],
      [10, 3],
      [12, 3],
    ];
    for (const [grade, count] of assignElectives) {
      studentIds[grade].forEach((sId, i) => {
        const values = [];
        for (let j = 0; j < count; j++) {
          const subId =
            subjectIdsMap[
              electiveMapping[grade][(i + j) % electiveMapping[grade].length]
            ];
          values.push(`(${sId},${subId})`);
        }
        const query = `INSERT INTO student_subjects (student_id, subject_id) VALUES ${values.join(
          ","
        )}`;
        pool.query(query);
      });
    }

    // 1️⃣2️⃣ Timetable
    for (const grade of [1, 6, 10, 12]) {
      const classId = classIds[grade];
      const tId = teacherIds[grade];
      const subjects = classSubjectsMapping[grade].map(
        (name) => subjectIdsMap[name]
      );
      let idx = 0;
      for (let day = 1; day <= 5; day++) {
        for (let slot = 1; slot <= 8; slot++) {
          const subId = subjects[idx % subjects.length];
          await pool.query(
            `INSERT INTO timetables (class_id, subject_id, teacher_id, day_of_week, slot)
             VALUES ($1,$2,$3,$4,$5)`,
            [classId, subId, tId, day, slot]
          );
          idx++;
        }
      }
    }

    console.log(
      "🎉 Database seeded successfully with electives and all subjects!"
    );
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await pool.end();
  }
}

run();
