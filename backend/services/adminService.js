const pool = require("../db");

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

  return {
    totalStudents,
    presentToday: presentCount,
    absentToday: absentCount,
    averageAttendance:
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0,
  };
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
      c.id as class_id,
      c.grade,
      c.name as class_name
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY u.username
  `);

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    full_name: row.username, // Using username as full name since no full_name column exists
    class_id: row.class_id,
    parent: {
      name: null,
      address: null,
    },
  }));
};

// Get all classes for admin
exports.getAllClasses = async () => {
  const result = await pool.query(`
    SELECT id, name, grade
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
      ROUND(AVG(m.marks), 1) as average_marks,
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
      ROUND(AVG(m.marks), 1) as average_marks,
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
      ROUND(AVG(m.marks), 1) as average_marks,
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
      ROUND(AVG(m.marks), 1) as average_marks,
      COUNT(m.id) as subjects_count
    FROM users u
    JOIN classes c ON u.class_id = c.id
    JOIN marks m ON u.id = m.student_id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    GROUP BY u.id, u.username, c.grade
    HAVING AVG(m.marks) < 50
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
      ROUND(AVG(m.marks), 1) as average_marks,
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
          WHEN ROUND(AVG(marks), 1) >= 90 THEN 'excellent'
          WHEN ROUND(AVG(marks), 1) >= 75 THEN 'good'
          WHEN ROUND(AVG(marks), 1) >= 60 THEN 'average'
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
      CONCAT(c.grade, c.name) as class_display,
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
