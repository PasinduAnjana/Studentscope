const pool = require("../db");

exports.getDashboardStats = async () => {
  const result = await pool.query(
    `SELECT COUNT(*) AS total_students FROM students`
  );
  return { students: result.rows[0].total_students };
};
