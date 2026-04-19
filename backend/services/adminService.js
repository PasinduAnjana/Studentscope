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

exports.getDashboardStats = async () => {
  // Get total students
  const studentsResult = await pool.query(
    `SELECT COUNT(*) AS total_students FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'student')`
  );

  // Get total teachers
  const teachersResult = await pool.query(
    `SELECT COUNT(*) AS total_teachers FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher')`
  );

  // Get total classes
  const classesResult = await pool.query(
    `SELECT COUNT(*) AS total_classes FROM classes`
  );

  // Get today's attendance stats
  const today = new Date().toISOString().split("T")[0];
  const attendanceResult = await pool.query(
    `
    SELECT
      COUNT(*) as total_students,
      COUNT(CASE WHEN a.status = true THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = false THEN 1 END) as absent_count
    FROM users u
    LEFT JOIN attendance a ON u.id = a.student_id AND a.date = $1
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
  `,
    [today]
  );

  const attendance = attendanceResult.rows[0];
  const presentCount = parseInt(attendance.present_count);
  const totalStudents = parseInt(attendance.total_students);
  const absentCount = parseInt(attendance.absent_count);

  return {
    students: parseInt(studentsResult.rows[0].total_students),
    teachers: parseInt(teachersResult.rows[0].total_teachers),
    classes: parseInt(classesResult.rows[0].total_classes),
    attendance: {
      totalStudents,
      presentToday: presentCount,
      absentToday: absentCount,
      averageAttendance:
        totalStudents > 0
          ? Math.round((presentCount / totalStudents) * 100)
          : 0,
    },
  };
};

// Get attendance statistics for a specific date
exports.getAttendanceStats = async (dateStr) => {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) as total_students,
      COUNT(CASE WHEN a.status = true THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = false THEN 1 END) as absent_count
    FROM users u
    LEFT JOIN attendance a ON u.id = a.student_id AND a.date = $1
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
  `,
    [dateStr]
  );

  const stats = result.rows[0];
  const presentCount = parseInt(stats.present_count);
  const totalStudents = parseInt(stats.total_students);
  const absentCount = parseInt(stats.absent_count);
  const notMarkedCount = totalStudents - presentCount - absentCount;

  return {
    totalStudents,
    presentToday: presentCount,
    absentToday: absentCount,
    notMarkedToday: notMarkedCount,
    averageAttendance:
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
  };
};

// Get attendance stats by class for charts
exports.getAttendanceStatsByClass = async (dateStr, gradeFilter = null) => {
  let query = `
    SELECT
      c.id as class_id,
      c.grade,
      c.name as class_name,
      COUNT(CASE WHEN a.status = true THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = false THEN 1 END) as absent_count
    FROM classes c
    LEFT JOIN attendance a ON c.id = a.class_id AND a.date = $1
  `;

  const params = [dateStr];

  if (gradeFilter) {
    query += ` WHERE c.grade = $2`;
    params.push(parseInt(gradeFilter, 10));
  }

  query += `
    GROUP BY c.id, c.grade, c.name
    ORDER BY c.grade, c.name
  `;

  const result = await pool.query(query, params);

  const classStats = {};
  result.rows.forEach((row) => {
    const className = `Grade ${row.grade} - ${row.class_name}`;
    classStats[className] = {
      present: parseInt(row.present_count) || 0,
      absent: parseInt(row.absent_count) || 0,
    };
  });

  return classStats;
};

// Get attendance records for a specific date with filtering
exports.getAttendanceRecords = async (dateStr, filters = {}) => {
  let query = `
    SELECT
      a.id,
      a.student_id,
      a.class_id,
      a.date,
      CASE WHEN a.status = true THEN 'present' ELSE 'absent' END as status,
      u.username,
      c.grade,
      c.name as class_name
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    JOIN classes c ON a.class_id = c.id
    WHERE a.date = $1
  `;

  const params = [dateStr];
  let paramIndex = 2;

  // Add filters
  if (filters.classId) {
    query += ` AND a.class_id = $${paramIndex}`;
    params.push(filters.classId);
    paramIndex++;
  }

  if (filters.status) {
    const statusBool = filters.status === "present" ? true : false;
    query += ` AND a.status = $${paramIndex}`;
    params.push(statusBool);
    paramIndex++;
  }

  // Add search filter
  if (filters.search) {
    query += ` AND u.username ILIKE $${paramIndex}`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY c.grade, c.name, u.username`;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    class_id: row.class_id,
    status: row.status,
    date: row.date,
    student_name: row.username,
    username: row.username,
    class_name: `${row.grade} - ${row.class_name}`,
  }));
};

// Get all students for admin
exports.getAllStudents = async () => {
  const result = await pool.query(`
    SELECT
      u.id,
      u.username,
      s.full_name,
      s.birthday,
      s.gender,
      c.id as class_id,
      c.grade,
      c.name as class_name,
      p.name as parent_name
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY u.username
  `);

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    full_name: row.full_name || row.username,
    birthday: row.birthday,
    gender: row.gender,
    class_id: row.class_id,
    grade: row.grade,
    class_name: row.class_name,
    parent: row.parent_name ? { name: row.parent_name } : null,
  }));
};

// Get a single student's full profile
exports.getStudentProfile = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      c.id as class_id,
      c.grade,
      c.name as class_name,
      p.name as parent_name,
      p.address as parent_address
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE u.id = $1 AND u.role_id = (SELECT id FROM roles WHERE name = 'student')
  `,
    [studentId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    index: row.username,
    full_name: row.full_name || row.username,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    grade: row.grade,
    class_name: row.class_name,
    guardian: row.parent_name || null,
    guardian_address: row.parent_address || null,
  };
};

// Get student attendance records
exports.getStudentAttendance = async (studentId, period = "last7") => {
  let dateCondition = "";
  let params = [studentId];

  if (period === "last7") {
    dateCondition = "AND a.date >= CURRENT_DATE - INTERVAL '7 days'";
  } else if (period === "month") {
    dateCondition =
      "AND EXTRACT(MONTH FROM a.date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM CURRENT_DATE)";
  } else if (period === "year") {
    dateCondition = "AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM CURRENT_DATE)";
  }

  const result = await pool.query(
    `
    SELECT
      a.date,
      a.status,
      c.grade,
      c.name as class_name
    FROM attendance a
    JOIN classes c ON a.class_id = c.id
    WHERE a.student_id = $1 ${dateCondition}
    ORDER BY a.date ASC
  `,
    params
  );

  const records = result.rows.map((row) => ({
    date: row.date,
    present: row.status,
  }));

  const total = records.length;
  const present = records.filter((r) => r.present).length;
  const absent = total - present;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    records,
    total,
    present,
    absent,
    percent,
  };
};

// Get student marks
exports.getStudentMarks = async (studentId, grade, term) => {
  let query = `
    SELECT
      m.marks,
      s.name as subject_name,
      e.name as exam_name,
      e.type,
      e.sub_type,
      e.year
    FROM marks m
    JOIN subjects s ON m.subject_id = s.id
    JOIN exams e ON m.exam_id = e.id
    WHERE m.student_id = $1
  `;
  const params = [studentId];
  let paramIndex = 2;

  if (grade) {
    query += ` AND e.target_grade = $${paramIndex}`;
    params.push(grade);
    paramIndex++;
  }

  if (term) {
    query += ` AND e.sub_type = $${paramIndex}`;
    params.push(term);
    paramIndex++;
  }

  query += ` ORDER BY e.year DESC, e.name, s.name`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    marks: row.marks,
    subject: row.subject_name,
    exam: row.exam_name,
    type: row.type,
    sub_type: row.sub_type,
    year: row.year,
  }));
};

// Get student behavior records
exports.getStudentBehavior = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      br.id,
      br.type,
      br.severity,
      br.description,
      br.created_at::DATE as date,
      COALESCE(td.full_name, cd.full_name, u.username) as reported_by_name
    FROM behavior_records br
    LEFT JOIN users reporter_u ON br.reported_by = reporter_u.id
    LEFT JOIN teacher_details td ON reporter_u.id = td.teacher_id
    LEFT JOIN clerk_details cd ON reporter_u.id = cd.clerk_id
    LEFT JOIN users u ON reporter_u.id = u.id
    WHERE br.student_id = $1
    ORDER BY br.created_at DESC
  `,
    [studentId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    severity: row.severity || "—",
    description: row.description,
    reportedBy: row.reported_by_name || "—",
  }));
};

// Get student government exam results
exports.getStudentGovExams = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      e.id,
      e.name,
      e.type,
      e.sub_type,
      e.year,
      m.marks
    FROM exams e
    JOIN marks m ON e.id = m.exam_id
    WHERE m.student_id = $1 AND e.type = 'gov'
    ORDER BY e.year DESC
  `,
    [studentId]
  );

  const exams = {};
  for (const row of result.rows) {
    const key = row.sub_type?.toLowerCase() || row.name.toLowerCase();
    if (key.includes("scholarship") || key.includes("grade5") || key.includes("grade 5")) {
      if (!exams.scholarship) {
        exams.scholarship = { year: row.year, score: row.marks, status: "—" };
      }
    } else if (key.includes("ol") || key.includes("o/l")) {
      if (!exams.ol) {
        exams.ol = { year: row.year, grades: {} };
      }
      const grade = row.marks;
      if (grade && !isNaN(grade)) {
        const gradeLetter = grade >= 75 ? "A" : grade >= 65 ? "B" : grade >= 50 ? "C" : grade >= 35 ? "S" : "F";
        exams.ol.grades[gradeLetter] = (exams.ol.grades[gradeLetter] || 0) + 1;
      }
    } else if (key.includes("al") || key.includes("a/l")) {
      if (!exams.al) {
        exams.al = { year: row.year, zScore: null, districtRank: null, islandRank: null, grades: {}, result: "—" };
      }
      const grade = row.marks;
      if (grade && !isNaN(grade)) {
        const gradeLetter = grade >= 75 ? "A" : grade >= 65 ? "B" : grade >= 50 ? "C" : grade >= 35 ? "S" : "F";
        exams.al.grades[gradeLetter] = (exams.al.grades[gradeLetter] || 0) + 1;
      }
    }
  }

  return exams;
};

// Get all classes for admin
exports.getAllClasses = async () => {
  const result = await pool.query(`
    SELECT id, name as class_name, grade
    FROM classes
    ORDER BY grade, name
  `);

  return result.rows;
};

// Get recent announcements for admin dashboard
exports.getRecentAnnouncements = async (limit = 5) => {
  const result = await pool.query(
    `
    SELECT
      a.id,
      a.title,
      a.description as content,
      a.created_at,
      u.username as posted_by_name
    FROM announcements a
    JOIN users u ON a.posted_by = u.id
    ORDER BY a.created_at DESC
    LIMIT $1
  `,
    [limit]
  );

  return result.rows;
};

// Get academic performance by grade
exports.getAcademicPerformanceByGrade = async () => {
  const result = await pool.query(`
    SELECT
      c.grade,
      ROUND(AVG(m.marks::numeric), 1) as average_marks,
      COUNT(DISTINCT m.student_id) as student_count
    FROM marks m
    JOIN users u ON m.student_id = u.id
    JOIN classes c ON u.class_id = c.id
    GROUP BY c.grade
    ORDER BY c.grade
  `);

  return result.rows;
};

// Get subject-wise performance
exports.getSubjectPerformance = async () => {
  const result = await pool.query(`
    SELECT
      s.name as subject_name,
      ROUND(AVG(m.marks::numeric), 1) as average_marks,
      COUNT(m.id) as total_marks,
      COUNT(DISTINCT m.student_id) as student_count
    FROM marks m
    JOIN subjects s ON m.subject_id = s.id
    GROUP BY s.id, s.name
    ORDER BY average_marks DESC
  `);

  return result.rows;
};

// Get top performers
exports.getTopPerformers = async (limit = 5) => {
  const result = await pool.query(
    `
    SELECT
      u.username,
      c.grade,
      ROUND(AVG(m.marks::numeric), 1) as average_marks,
      COUNT(m.id) as subjects_count
    FROM users u
    JOIN classes c ON u.class_id = c.id
    JOIN marks m ON u.id = m.student_id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    GROUP BY u.id, u.username, c.grade
    ORDER BY average_marks DESC
    LIMIT $1
  `,
    [limit]
  );

  return result.rows;
};

// Get students needing attention (low performance)
exports.getStudentsNeedingAttention = async (limit = 5) => {
  const result = await pool.query(
    `
    SELECT
      u.username,
      c.grade,
      ROUND(AVG(m.marks::numeric), 1) as average_marks,
      COUNT(m.id) as subjects_count
    FROM users u
    JOIN classes c ON u.class_id = c.id
    JOIN marks m ON u.id = m.student_id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    GROUP BY u.id, u.username, c.grade
    HAVING AVG(m.marks::numeric) < 50
    ORDER BY average_marks ASC
    LIMIT $1
  `,
    [limit]
  );

  return result.rows;
};

// Get recent exams
exports.getRecentExams = async (limit = 5) => {
  const result = await pool.query(
    `
    SELECT
      e.name as exam_name,
      s.name as subject_name,
      c.grade,
      e.year as exam_year,
      ROUND(AVG(m.marks::numeric), 1) as average_marks,
      COUNT(m.id) as total_students
    FROM exams e
    JOIN marks m ON e.id = m.exam_id
    JOIN subjects s ON m.subject_id = s.id
    JOIN users u ON m.student_id = u.id
    JOIN classes c ON u.class_id = c.id
    GROUP BY e.id, e.name, s.id, s.name, c.grade, e.year
    ORDER BY e.id DESC
    LIMIT $1
  `,
    [limit]
  );

  return result.rows;
};

// Get performance distribution
exports.getPerformanceDistribution = async () => {
  const result = await pool.query(`
    SELECT
      performance_level,
      COUNT(*) as student_count
    FROM (
      SELECT
        CASE
          WHEN ROUND(AVG(marks::numeric), 1) >= 90 THEN 'excellent'
          WHEN ROUND(AVG(marks::numeric), 1) >= 75 THEN 'good'
          WHEN ROUND(AVG(marks::numeric), 1) >= 60 THEN 'average'
          ELSE 'poor'
        END as performance_level
      FROM marks
      GROUP BY student_id
    ) categorized_students
    GROUP BY performance_level
    ORDER BY
      CASE performance_level
        WHEN 'excellent' THEN 1
        WHEN 'good' THEN 2
        WHEN 'average' THEN 3
        WHEN 'poor' THEN 4
      END
  `);

  return result.rows;
};

exports.getAllTeachers = async () => {
  const result = await pool.query(`
    SELECT 
      td.teacher_id,
      td.full_name,
      td.nic,
      td.address,
      td.phone_number,
      td.past_schools,
      td.appointment_date,
      td.first_appointment_date,
      td.level,
      td.birthday
    FROM teacher_details td
    ORDER BY td.full_name
  `);
  return result.rows;
};

exports.getAllClerks = async () => {
  const result = await pool.query(`
    SELECT 
      cd.clerk_id as id,
      cd.clerk_id,
      cd.full_name,
      cd.nic,
      cd.address,
      cd.phone_number,
      cd.appointment_date,
      cd.first_appointment_date,
      cd.birthday,
      u.username
    FROM clerk_details cd
    JOIN users u ON cd.clerk_id = u.id
    ORDER BY cd.full_name
  `);
  return result.rows;
};

exports.createClerk = async ({
  full_name,
  nic,
  address,
  phone_number,
  birthday,
  appointment_date,
  first_appointment_date,
}) => {
  const checkResult = await pool.query(
    "SELECT id FROM users WHERE username = $1",
    [nic]
  );
  if (checkResult.rows.length > 0) {
    throw new Error("NIC already exists");
  }

  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE name = 'clerk'"
  );
  if (!roleRes.rows.length) throw new Error("Role 'clerk' not found");
  const roleId = roleRes.rows[0].id;

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(nic, salt);

  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [nic, hashedPassword, salt, roleId]
  );
  const userId = userResult.rows[0].id;

  await pool.query(
    `INSERT INTO clerk_details (clerk_id, full_name, nic, address, phone_number, appointment_date, first_appointment_date, birthday)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      full_name,
      nic,
      address || null,
      phone_number || null,
      appointment_date || null,
      first_appointment_date || null,
      birthday || null,
    ]
  );

  return { id: userId, full_name, nic, username: nic };
};

exports.updateClerk = async (
  clerkId,
  {
    full_name,
    nic,
    address,
    phone_number,
    birthday,
    appointment_date,
    first_appointment_date,
  }
) => {
  const checkResult = await pool.query(
    "SELECT id FROM users WHERE username = $1 AND id != $2",
    [nic, clerkId]
  );
  if (checkResult.rows.length > 0) {
    throw new Error("NIC already exists");
  }

  await pool.query(
    `UPDATE clerk_details SET
       full_name = $1,
       nic = $2,
       address = $3,
       phone_number = $4,
       birthday = $5,
       appointment_date = $6,
       first_appointment_date = $7
     WHERE clerk_id = $8`,
    [
      full_name,
      nic,
      address || null,
      phone_number || null,
      birthday || null,
      appointment_date || null,
      first_appointment_date || null,
      clerkId,
    ]
  );

  await pool.query("UPDATE users SET username = $1 WHERE id = $2", [
    nic,
    clerkId,
  ]);

  return { id: clerkId, full_name, nic, username: nic };
};

exports.getClerkById = async (clerkId) => {
  const result = await pool.query(
    `SELECT td.clerk_id as id, td.full_name, td.nic, td.address, td.phone_number
     FROM clerk_details td WHERE td.clerk_id = $1`,
    [clerkId]
  );
  return result.rows[0];
};

exports.deleteClerk = async (clerkId) => {
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [clerkId]);
  await pool.query("DELETE FROM clerk_details WHERE clerk_id = $1", [clerkId]);
  const result = await pool.query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [clerkId]
  );
  return result.rows.length > 0;
};

exports.resetClerkPassword = async (clerkId, newPassword) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(newPassword, salt);

  const result = await pool.query(
    `UPDATE users SET password = $1, salt = $2 WHERE id = $3 AND role_id = (SELECT id FROM roles WHERE name = 'clerk') RETURNING id`,
    [hashedPassword, salt, clerkId]
  );

  if (result.rows.length === 0) {
    throw new Error("Clerk not found");
  }

  return { id: clerkId };
};

// ============ BEHAVIOR RECORDS ============
exports.getBehaviorStats = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN type = 'Good' THEN 1 END) as good_count,
      COUNT(CASE WHEN type = 'Disciplinary' THEN 1 END) as disciplinary_count,
      COUNT(CASE WHEN type = 'Reward' THEN 1 END) as reward_count
    FROM behavior_records
  `);

  const stats = result.rows[0];
  return {
    totalRecords: parseInt(stats.total),
    goodBehavior: parseInt(stats.good_count),
    disciplinaryCases: parseInt(stats.disciplinary_count),
    rewards: parseInt(stats.reward_count),
  };
};

exports.getBehaviorRecords = async (filters = {}) => {
  let query = `
    SELECT
      br.id,
      br.student_id,
      br.class_id,
      br.type,
      br.severity,
      br.description,
      br.reported_by,
      br.created_at::DATE as date,
      u.username as index_no,
      s.full_name as student_name,
      c.grade,
      c.name as class_name,
      CONCAT(c.grade, '-', c.name) as class_display,
      reporter.full_name as reported_by_name
    FROM behavior_records br
    JOIN users u ON br.student_id = u.id
    JOIN students s ON u.id = s.user_id
    JOIN classes c ON br.class_id = c.id
    LEFT JOIN users reporter_u ON br.reported_by = reporter_u.id
    LEFT JOIN teacher_details reporter ON reporter_u.id = reporter.teacher_id
  `;

  const conditions = [];
  const params = [];

  if (filters.class_id) {
    conditions.push(`br.class_id = $${params.length + 1}`);
    params.push(filters.class_id);
  }

  if (filters.type && filters.type !== "all") {
    conditions.push(`br.type = $${params.length + 1}`);
    params.push(filters.type);
  }

  if (filters.start_date) {
    conditions.push(`br.created_at::DATE >= $${params.length + 1}`);
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    conditions.push(`br.created_at::DATE <= $${params.length + 1}`);
    params.push(filters.end_date);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY br.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    id: row.id,
    class: row.class_display,
    student: row.student_name,
    date: row.date,
    type: row.type,
    severity: row.severity || "—",
    description: row.description,
    reportedBy: row.reported_by_name || "—",
  }));
};

exports.addBehaviorRecord = async (
  studentId,
  classId,
  type,
  severity,
  description,
  reportedById
) => {
  const result = await pool.query(
    `
    INSERT INTO behavior_records (student_id, class_id, type, severity, description, reported_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at::DATE as date
  `,
    [studentId, classId, type, severity || null, description, reportedById]
  );
  return result.rows[0];
};

exports.updateBehaviorRecord = async (
  recordId,
  studentId,
  classId,
  type,
  severity,
  description
) => {
  const result = await pool.query(
    `
    UPDATE behavior_records 
    SET student_id = $1, class_id = $2, type = $3, severity = $4, description = $5 
    WHERE id = $6
    RETURNING id
  `,
    [studentId, classId, type, severity || null, description, recordId]
  );
  return result.rowCount > 0;
};

exports.deleteBehaviorRecord = async (recordId) => {
  const result = await pool.query(
    `DELETE FROM behavior_records WHERE id = $1 RETURNING id`,
    [recordId]
  );
  return result.rows.length > 0;
};

exports.getPendingPasswordResets = async () => {
  try {
    const result = await pool.query(
      `SELECT prr.id, prr.user_id, prr.role, u.username, prr.created_at
       FROM password_reset_requests prr
       JOIN users u ON prr.user_id = u.id
       WHERE prr.status = 'pending' AND prr.role IN ('teacher', 'clerk', 'admin')
       ORDER BY prr.created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error("Error getting pending password resets:", err);
    return [];
  }
};

exports.approvePasswordReset = async (resetId, approverId) => {
  try {
    const resetResult = await pool.query(
      "SELECT * FROM password_reset_requests WHERE id = $1 AND status = 'pending'",
      [resetId]
    );

    if (resetResult.rows.length === 0) {
      return { success: false, error: "Reset request not found" };
    }

    const reset = resetResult.rows[0];

    if (reset.new_password && reset.new_salt) {
      // Update user password
      await pool.query(
        "UPDATE users SET password = $1, salt = $2 WHERE id = $3",
        [reset.new_password, reset.new_salt, reset.user_id]
      );
    }

    // Update reset request status
    await pool.query(
      "UPDATE password_reset_requests SET status = 'approved', approved_by = $1, approved_at = now() WHERE id = $2",
      [approverId, resetId]
    );

    return { success: true, message: "Password reset approved" };
  } catch (err) {
    console.error("Error approving password reset:", err);
    return { success: false, error: "Failed to approve password reset" };
  }
};

// ============ ACADEMIC REPORTS ============

// Get filter options for academic reports (with optional cascading based on exam/class)
exports.getAcademicReportsFilters = async (examId = null, classId = null) => {
  const exams = await pool.query(
    `SELECT id, name, type, sub_type, year FROM exams ORDER BY year DESC, name`
  );

  let classes, subjects;

  if (examId && classId) {
    // Both exam and class selected - get subjects that have marks for this combo
    subjects = await pool.query(
      `SELECT DISTINCT s.id, s.name 
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.exam_id = $1 AND m.student_id IN (
         SELECT id FROM users WHERE class_id = $2
       )
       ORDER BY s.name`,
      [examId, classId]
    );
    classes = await pool.query(
      `SELECT DISTINCT c.id, c.name, c.grade
       FROM marks m
       JOIN users u ON m.student_id = u.id
       JOIN classes c ON u.class_id = c.id
       WHERE m.exam_id = $1
       ORDER BY c.grade, c.name`,
      [examId]
    );
  } else if (examId) {
    // Only exam selected - get classes that have marks for this exam
    classes = await pool.query(
      `SELECT DISTINCT c.id, c.name, c.grade
       FROM marks m
       JOIN users u ON m.student_id = u.id
       JOIN classes c ON u.class_id = c.id
       WHERE m.exam_id = $1
       ORDER BY c.grade, c.name`,
      [examId]
    );
    subjects = await pool.query(
      `SELECT DISTINCT s.id, s.name 
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.exam_id = $1
       ORDER BY s.name`,
      [examId]
    );
  } else {
    // No exam selected - return all
    classes = await pool.query(
      `SELECT id, name, grade FROM classes ORDER BY grade, name`
    );
    subjects = await pool.query(
      `SELECT id, name FROM subjects ORDER BY name`
    );
  }

  return {
    exams: exams.rows,
    classes: classes.rows,
    subjects: subjects.rows,
  };
};

// Get academic report data with filters
exports.getAcademicReportsData = async (filters = {}) => {
  let query = `
    SELECT
      m.id,
      m.marks,
      CASE WHEN e.sub_type = 'Grade5' THEN 'Total' ELSE s.name END as subject_name,
      u.username as index_number,
      st.full_name as student_name,
      c.grade,
      c.name as class_name,
      CONCAT(c.grade, '-', c.name) as class_display,
      e.name as exam_name,
      e.id as exam_id
    FROM marks m
    JOIN users u ON m.student_id = u.id
    JOIN subjects s ON m.subject_id = s.id
    JOIN classes c ON u.class_id = c.id
    LEFT JOIN students st ON u.id = st.user_id
    JOIN exams e ON m.exam_id = e.id
  `;

  const conditions = [];
  const params = [];

  if (filters.exam_id) {
    conditions.push(`m.exam_id = $${params.length + 1}`);
    params.push(filters.exam_id);
  }

  if (filters.class_id) {
    conditions.push(`u.class_id = $${params.length + 1}`);
    params.push(filters.class_id);
  }

  if (filters.subject_id) {
    conditions.push(`m.subject_id = $${params.length + 1}`);
    params.push(filters.subject_id);
  }

  if (filters.search) {
    conditions.push(
      `(u.username ILIKE $${params.length + 1} OR st.full_name ILIKE $${params.length + 1})`
    );
    params.push(`%${filters.search}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY c.grade, c.name, st.full_name, s.name`;

  // Limit to 500 rows for performance
  query += ` LIMIT 500`;

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    student_name: row.student_name || row.index_number,
    index_number: row.index_number,
    class: row.class_display,
    subject: row.subject_name,
    marks: row.marks,
    exam: row.exam_name,
  }));
};

// Get summary stats for academic reports
exports.getAcademicReportsSummary = async (filters = {}) => {
  let query = `
    SELECT
      COUNT(m.id) as total_records,
      COUNT(DISTINCT m.student_id) as total_students,
      ROUND(AVG(CASE WHEN m.marks ~ '^[0-9\\.]+$' THEN CAST(m.marks AS NUMERIC) END), 1) as avg_marks,
      COUNT(CASE 
        WHEN m.marks ~ '^[0-9\\.]+$' AND CAST(m.marks AS NUMERIC) >= 50 THEN 1 
        WHEN m.marks IN ('A', 'B', 'C', 'S', 'Pass') THEN 1
      END) as pass_count
    FROM marks m
    JOIN users u ON m.student_id = u.id
    JOIN exams e ON m.exam_id = e.id
  `;

  const conditions = [];
  const params = [];

  if (filters.exam_id) {
    conditions.push(`m.exam_id = $${params.length + 1}`);
    params.push(filters.exam_id);
  }

  if (filters.class_id) {
    conditions.push(`u.class_id = $${params.length + 1}`);
    params.push(filters.class_id);
  }

  if (filters.subject_id) {
    conditions.push(`m.subject_id = $${params.length + 1}`);
    params.push(filters.subject_id);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  const result = await pool.query(query, params);
  const row = result.rows[0];
  const total = parseInt(row.total_records) || 0;
  const pass = parseInt(row.pass_count) || 0;

  // Get top subject
  let topSubjectQuery = `
    SELECT s.name, ROUND(AVG(CASE WHEN m.marks ~ '^[0-9\\.]+$' THEN CAST(m.marks AS NUMERIC) END), 1) as avg
    FROM marks m
    JOIN subjects s ON m.subject_id = s.id
    JOIN users u ON m.student_id = u.id
    JOIN exams e ON m.exam_id = e.id
  `;

  if (conditions.length) {
    topSubjectQuery += ` WHERE ${conditions.join(" AND ")}`;
  }

  topSubjectQuery += ` GROUP BY s.id, s.name ORDER BY avg DESC NULLS LAST LIMIT 1`;

  const topResult = await pool.query(topSubjectQuery, params);
  const topSubject = topResult.rows[0];

  return {
    totalStudents: parseInt(row.total_students) || 0,
    totalRecords: total,
    avgMarks: parseFloat(row.avg_marks) || 0,
    passRate: total > 0 ? Math.round((pass / total) * 100) : 0,
    topSubject: topSubject && topSubject.avg ? `${topSubject.name} (${topSubject.avg}%)` : "--",
  };
};

// Get academic report data pivoted (one row per student, subjects as columns)
exports.getAcademicReportsDataPivot = async (filters = {}) => {
  if (!filters.exam_id) {
    return { data: [], subjects: [] };
  }

  // First, get the list of subjects for this exam (optionally filtered by class)
  // Also include null subject for exams like Grade 5 Scholarship (total marks)
  let subjectsQuery = `
    SELECT DISTINCT s.id, s.name 
    FROM marks m
    LEFT JOIN subjects s ON m.subject_id = s.id
    WHERE m.exam_id = $1
  `;
  const subjectParams = [filters.exam_id];

  if (filters.class_id) {
    subjectsQuery += ` AND m.student_id IN (SELECT id FROM users WHERE class_id = $2)`;
    subjectParams.push(filters.class_id);
  }

  subjectsQuery += ` ORDER BY s.name`;

  const subjectsRes = await pool.query(subjectsQuery, subjectParams);
  
  // Handle null subject (for exams like Grade 5 Scholarship)
  const subjects = subjectsRes.rows;
  
  // Check if there's a null subject (for Grade 5)
  const hasNullSubject = subjects.some(s => s.id === null);
  if (hasNullSubject) {
    // Filter out the null entry and add "Total" as a special subject
    const filteredSubjects = subjects.filter(s => s.id !== null);
    filteredSubjects.unshift({ id: 'TOTAL', name: 'Total' });
    subjects.length = 0;
    subjects.push(...filteredSubjects);
  }
  
  if (subjects.length === 0) {
    return { data: [], subjects: [] };
  }

  // Build dynamic CASE expressions for each subject
  // Handle special case for Total (null subject_id)
  const caseExpressions = subjects.map(s => {
    if (s.id === 'TOTAL') {
      return `MAX(CASE WHEN m.subject_id IS NULL THEN m.marks END) AS "Total"`;
    }
    return `MAX(CASE WHEN s.id = ${s.id} THEN m.marks END) AS "${s.name}"`;
  }).join(',\n      ');

  let query = `
    SELECT 
      st.full_name as student_name,
      u.username as index_number,
      c.grade,
      c.name as class_name,
      CONCAT(c.grade, '-', c.name) as class_display,
      e.name as exam_name,
      ${caseExpressions}
    FROM marks m
    JOIN users u ON m.student_id = u.id
    LEFT JOIN subjects s ON m.subject_id = s.id
    JOIN classes c ON u.class_id = c.id
    LEFT JOIN students st ON u.id = st.user_id
    JOIN exams e ON m.exam_id = e.id
  `;

  const conditions = [`m.exam_id = $1`];
  const params = [filters.exam_id];

  if (filters.class_id) {
    conditions.push(`u.class_id = $2`);
    params.push(filters.class_id);
  }

  if (filters.search) {
    conditions.push(`(u.username ILIKE $${params.length + 1} OR st.full_name ILIKE $${params.length + 1})`);
    params.push(`%${filters.search}%`);
  }

  query += ` WHERE ${conditions.join(" AND ")}`;
  query += ` GROUP BY st.full_name, u.username, c.grade, c.name, e.name`;
  query += ` ORDER BY c.grade, c.name, st.full_name`;
  query += ` LIMIT 500`;

  const result = await pool.query(query, params);

  return {
    data: result.rows,
    subjects: subjects.map(s => s.name)
  };
};

// Get summary stats for pivoted academic reports
exports.getAcademicReportsPivotSummary = async (filters = {}) => {
  if (!filters.exam_id) {
    return { totalStudents: 0, avgMarks: 0, passRate: 0, topSubject: "--" };
  }

  // Get total students with marks for this exam
  const studentQuery = `
    SELECT COUNT(DISTINCT m.student_id) as total_students
    FROM marks m
    WHERE m.exam_id = $1
  `;
  const studentRes = await pool.query(studentQuery, [filters.exam_id]);
  const totalStudents = parseInt(studentRes.rows[0].total_students) || 0;

  // Get average marks across all subjects
  const avgQuery = `
    SELECT ROUND(AVG(CAST(m.marks AS NUMERIC)), 1) as avg_marks
    FROM marks m
    WHERE m.exam_id = $1
  `;
  const avgRes = await pool.query(avgQuery, [filters.exam_id]);
  const avgMarks = parseFloat(avgRes.rows[0].avg_marks) || 0;

  // Get pass rate (marks >= 50)
  const passQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN CAST(m.marks AS NUMERIC) >= 50 THEN 1 END) as pass_count
    FROM marks m
    WHERE m.exam_id = $1
  `;
  const passRes = await pool.query(passQuery, [filters.exam_id]);
  const total = parseInt(passRes.rows[0].total) || 0;
  const passCount = parseInt(passRes.rows[0].pass_count) || 0;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  // Get top subject (highest average)
  const topQuery = `
    SELECT s.name, ROUND(AVG(CAST(m.marks AS NUMERIC)), 1) as avg
    FROM marks m
    JOIN subjects s ON m.subject_id = s.id
    WHERE m.exam_id = $1
    GROUP BY s.id, s.name
    ORDER BY avg DESC NULLS LAST
    LIMIT 1
  `;
  const topRes = await pool.query(topQuery, [filters.exam_id]);
  const topSubject = topRes.rows[0];

  return {
    totalStudents,
    avgMarks,
    passRate,
    topSubject: topSubject && topSubject.avg ? `${topSubject.name} (${topSubject.avg}%)` : "--"
  };
};

exports.rejectPasswordReset = async (resetId, rejectedBy) => {
  try {
    const resetResult = await pool.query(
      "SELECT * FROM password_reset_requests WHERE id = $1 AND status = 'pending'",
      [resetId]
    );

    if (resetResult.rows.length === 0) {
      return { success: false, error: "Reset request not found" };
    }

    // Update reset request status
    await pool.query(
      "UPDATE password_reset_requests SET status = 'rejected', approved_by = $1, approved_at = now() WHERE id = $2",
      [rejectedBy, resetId]
    );

    return { success: true, message: "Password reset rejected" };
  } catch (err) {
    console.error("Error rejecting password reset:", err);
    return { success: false, error: "Failed to reject password reset" };
  }
};

exports.getAlerts = async () => {
  const alerts = [];

  const noTeacher = await pool.query(`
    SELECT COUNT(*) as count
    FROM classes c
    WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
  `);
  const noTeacherCount = parseInt(noTeacher.rows[0].count);
  if (noTeacherCount > 0) {
    alerts.push({
      key: "no_teacher",
      type: "danger",
      icon: "fas fa-chalkboard-user",
      message: { en: "Classes without a teacher", si: "ගුරුවරයෙකු නැති පන්ති", ta: "ஆசிரியர் இல்லாத வகுப்புகள்" },
      count: noTeacherCount,
    });
  }

  const noClass = await pool.query(`
    SELECT COUNT(*) as count
    FROM users u
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
      AND (u.class_id IS NULL)
  `);
  const noClassCount = parseInt(noClass.rows[0].count);
  if (noClassCount > 0) {
    alerts.push({
      key: "no_class",
      type: "danger",
      icon: "fas fa-user-xmark",
      message: { en: "Students not assigned to a class", si: "පන්තියකට පවරා නැති සිසුන්", ta: "வகுப்பு ஒதுக்கப்படாத மாணவர்கள்" },
      count: noClassCount,
    });
  }

  const noParent = await pool.query(`
    SELECT COUNT(*) as count
    FROM students s
    WHERE s.parent_id IS NULL
  `);
  const noParentCount = parseInt(noParent.rows[0].count);
  if (noParentCount > 0) {
    alerts.push({
      key: "no_parent",
      type: "warning",
      icon: "fas fa-user-slash",
      message: { en: "Students without guardian info", si: "භාරකරු තොරතුරු නැති සිසුන්", ta: "பாதுகாவலர் தகவல் இல்லாத மாணவர்கள்" },
      count: noParentCount,
    });
  }

  const noTimetable = await pool.query(`
    SELECT COUNT(*) as count
    FROM classes c
    WHERE c.id NOT IN (
      SELECT DISTINCT ts.class_id
      FROM timetables t
      JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    )
  `);
  const noTimetableCount = parseInt(noTimetable.rows[0].count);
  if (noTimetableCount > 0) {
    alerts.push({
      key: "no_timetable",
      type: "warning",
      icon: "fas fa-calendar-times",
      message: { en: "Classes without a timetable", si: "කාලසටහනක් නැති පන්ති", ta: "நேர அட்டவணை இல்லாத வகுப்புகள்" },
      count: noTimetableCount,
    });
  }

  return alerts;
};

exports.getAlertDetails = async (alertKey) => {
  let result;
  switch (alertKey) {
    case "no_teacher":
      result = await pool.query(`
        SELECT c.id, c.grade, c.name
        FROM classes c
        WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
        ORDER BY c.grade, c.name
      `);
      break;
    case "no_class":
      result = await pool.query(`
        SELECT u.id, u.username, s.full_name
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
          AND u.class_id IS NULL
        ORDER BY s.full_name
        LIMIT 50
      `);
      break;
    case "no_parent":
      result = await pool.query(`
        SELECT s.id, s.full_name, c.grade, c.name AS class_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE s.parent_id IS NULL
        ORDER BY c.grade, c.name, s.full_name
        LIMIT 50
      `);
      break;
    case "no_timetable":
      result = await pool.query(`
        SELECT c.id, c.grade, c.name
        FROM classes c
        WHERE c.id NOT IN (
          SELECT DISTINCT ts.class_id
          FROM timetables t
          JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
        )
        ORDER BY c.grade, c.name
      `);
      break;
    default:
      return null;
  }
  return result.rows;
};

// ============ CERTIFICATES ============
exports.getCertificates = async (filters = {}) => {
  let query = `
    SELECT
      cert.id,
      cert.type,
      cert.reason,
      cert.status,
      cert.created_at,
      u.username as index_number,
      s.full_name as student_name,
      c.grade,
      c.name as class_name,
      CONCAT(c.grade, '-', c.name) as class_display
    FROM certificates cert
    JOIN users u ON cert.student_id = u.id
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
  `;

  const conditions = [];
  const params = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(`cert.status = $${params.length + 1}`);
    params.push(filters.status);
  }

  if (filters.type && filters.type !== "all") {
    conditions.push(`cert.type = $${params.length + 1}`);
    params.push(filters.type);
  }

  if (filters.class_id) {
    conditions.push(`u.class_id = $${params.length + 1}`);
    params.push(filters.class_id);
  }

  if (filters.search) {
    conditions.push(
      `(u.username ILIKE $${params.length + 1} OR s.full_name ILIKE $${params.length + 1})`
    );
    params.push(`%${filters.search}%`);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY cert.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

exports.getCertificateById = async (certId) => {
  const result = await pool.query(`
    SELECT
      cert.id,
      cert.type,
      cert.reason,
      cert.status,
      cert.created_at,
      cert.updated_at,
      u.username as index_number,
      s.full_name as student_name,
      s.birthday,
      c.grade,
      c.name as class_name,
      CONCAT(c.grade, '-', c.name) as class_display,
      p.name as parent_name,
      p.address as parent_address
    FROM certificates cert
    JOIN users u ON cert.student_id = u.id
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE cert.id = $1
  `, [certId]);

  if (result.rows.length === 0) return null;

  const cert = result.rows[0];

  // Get achievements for character certificate
  let achievements = [];
  if (cert.type === "character") {
    const achResult = await pool.query(`
      SELECT title, description, category, achieved_at
      FROM achievements
      WHERE student_id = $1
      ORDER BY achieved_at DESC
    `, [cert.student_id]);
    achievements = achResult.rows;
  }

  return { ...cert, achievements };
};

exports.approveCertificate = async (certId) => {
  const result = await pool.query(`
    UPDATE certificates 
    SET status = 'approved', updated_at = now()
    WHERE id = $1
    RETURNING id, status
  `, [certId]);
  return result.rows[0];
};

exports.rejectCertificate = async (certId) => {
  const result = await pool.query(`
    UPDATE certificates 
    SET status = 'rejected', updated_at = now()
    WHERE id = $1
    RETURNING id, status
  `, [certId]);
  return result.rows[0];
};

exports.getCertificateStats = async () => {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
    FROM certificates
  `);
  return result.rows[0];
};

// ============ SCHOOL DETAILS ============
exports.getSchoolDetails = async () => {
  const result = await pool.query(`SELECT * FROM school_details LIMIT 1`);
  return result.rows[0] || null;
};

exports.updateSchoolDetails = async (data) => {
  const existing = await pool.query(`SELECT id FROM school_details LIMIT 1`);
  
  if (existing.rows.length === 0) {
    const result = await pool.query(`
      INSERT INTO school_details (school_name, address, phone, email, logo_url, principal_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.school_name, data.address, data.phone, data.email, data.logo_url, data.principal_name]);
    return result.rows[0];
  } else {
    const result = await pool.query(`
      UPDATE school_details 
      SET school_name = $1, address = $2, phone = $3, email = $4, logo_url = $5, principal_name = $6, updated_at = now()
      WHERE id = $7
      RETURNING *
    `, [data.school_name, data.address, data.phone, data.email, data.logo_url, data.principal_name, existing.rows[0].id]);
    return result.rows[0];
  }
};
