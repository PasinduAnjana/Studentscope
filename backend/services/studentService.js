const pool = require("../db/index");

exports.getTodaysTimetable = async (studentId) => {
  // Get current day of week (1 = Monday, 7 = Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Convert Sunday from 0 to 7

  const result = await pool.query(
    `
    SELECT
      t.slot as slot,
      s.name as subject,
      td.full_name as teacher_name
    FROM timetables t
    JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    JOIN subjects s ON ts.subject_id = s.id
    LEFT JOIN teacher_details td ON ts.teacher_id = td.teacher_id
    WHERE ts.class_id = (SELECT class_id FROM users WHERE id = $1)
      AND t.day_of_week = $2
    ORDER BY t.slot
    `,
    [studentId, dayOfWeek]
  );
  return result.rows;
};

exports.getWeeklyTimetable = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      t.day_of_week,
      t.slot as period_number,
      s.name as subject,
      td.full_name as teacher_name
    FROM timetables t
    JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    JOIN subjects s ON ts.subject_id = s.id
    LEFT JOIN teacher_details td ON ts.teacher_id = td.teacher_id
    WHERE ts.class_id = (SELECT class_id FROM users WHERE id = $1)
    ORDER BY t.day_of_week, t.slot
    `,
    [studentId]
  );
  return result.rows;
};

exports.getAttendancePercentage = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) as total_days,
      COUNT(CASE WHEN status = true THEN 1 END) as present_days
    FROM attendance
    WHERE student_id = $1
    `,
    [studentId]
  );

  const data = result.rows[0];
  return {
    totalDays: parseInt(data.total_days),
    presentDays: parseInt(data.present_days),
  };
};

exports.getPresentDays = async (studentId) => {
  // Get present days for current month
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const result = await pool.query(
    `
    SELECT COUNT(*) as present_days
    FROM attendance
    WHERE student_id = $1
      AND EXTRACT(MONTH FROM date) = $2
      AND EXTRACT(YEAR FROM date) = $3
      AND status = true
    `,
    [studentId, currentMonth, currentYear]
  );

  return parseInt(result.rows[0].present_days);
};

exports.getAverageMarks = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      AVG(m.marks) as average,
      COUNT(DISTINCT m.subject_id) as subject_count
    FROM marks m
    WHERE m.student_id = $1
    `,
    [studentId]
  );

  const data = result.rows[0];
  return {
    average: data.average ? parseFloat(data.average) : null,
    subjectCount: parseInt(data.subject_count),
  };
};

exports.getAchievements = async (studentId) => {
  const result = await pool.query(
    `
    SELECT
      description,
      achieved_at
    FROM achievements
    WHERE student_id = $1
    ORDER BY achieved_at DESC
    `,
    [studentId]
  );
  return result.rows;
};

exports.getAnnouncementsForStudent = async (studentId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT
      a.id,
      a.title,
      a.description,
      a.created_at,
      a.audience_type,
      u.username as posted_by_name,
      CASE
        WHEN a.audience_type = 'all' THEN 'All (Teachers & Students)'
        WHEN a.audience_type = 'teachers' THEN 'Teachers'
        WHEN a.audience_type = 'students' THEN 'Students'
      END as audience_display
    FROM announcements a
    LEFT JOIN users u ON a.posted_by = u.id
    LEFT JOIN announcement_classes ac ON a.id = ac.announcement_id
    WHERE a.audience_type = 'all'
       OR (a.audience_type = 'students'
           AND ac.class_id = (SELECT class_id FROM users WHERE id = $1))
    ORDER BY a.created_at DESC
    `,
    [studentId]
  );
  return result.rows;
};

exports.getProfile = async (studentId) => {
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
      c.name as class_name,
      c.grade as class_grade,
      p.name as parent_name,
      p.address as parent_address
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE u.id = $1
    `,
    [studentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Student not found");
  }

  return result.rows[0];
};
