const pool = require("../db");

// Get all students with class info
exports.getStudents = async () => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.username,
      u.class_id,
      u.is_class_teacher,
      c.grade,
      c.name AS class_name
    FROM users u
    LEFT JOIN classes c 
      ON u.class_id = c.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY u.id
  `);

  // Map to previous returning format
  return result.rows.map((row) => ({
    id: row.id,
    name: row.username, // old "name" field maps to username
    email: null, // email is no longer in DB
    age: null, // age is no longer in DB
    class_id: row.class_id,
    class_name: row.class_name,
    grade: row.grade,
  }));
};

// Get today's timetable for a teacher
exports.getTeacherTodayTimetable = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT 
      t.slot AS period_number,
      s.name AS subject,
      c.name AS class_name,
      c.grade
    FROM timetables t
    JOIN subjects s 
      ON t.subject_id = s.id
    JOIN classes c 
      ON t.class_id = c.id
    WHERE t.teacher_id = $1
      AND t.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE) -- Monday=1
    ORDER BY t.slot
    `,
    [teacherId]
  );

  // Map to previous returning format
  return result.rows.map((row) => ({
    slot: row.period_number,
    subject: row.subject,
    class_name: row.class_name,
    grade: row.grade,
  }));
};
