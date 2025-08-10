const pool = require("../db");

exports.getStudents = async () => {
  const result = await pool.query(`
    SELECT s.*, c.grade, c.name AS class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
  `);
  return result.rows;
};
