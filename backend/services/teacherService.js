const pool = require("../db");

exports.getStudents = async () => {
  const result = await pool.query(`
    SELECT s.*, c.grade, c.name AS class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
  `);
  return result.rows;
};

exports.getTeacherTodayTimetable = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT 
      t.period_number AS slot,
      s.name AS subject,
      c.name AS class_name,
      c.grade
    FROM timetables t
    JOIN teacher_class_subject tcs 
      ON t.teacher_class_subject_id = tcs.id
    JOIN subjects s 
      ON tcs.subject_id = s.id
    JOIN classes c 
      ON tcs.class_id = c.id
    WHERE tcs.teacher_id = $1
      AND t.day_of_week = EXTRACT(ISODOW FROM CURRENT_DATE) -- Monday=1
    ORDER BY t.period_number
    `,
    [teacherId]
  );
  return result.rows;
};
