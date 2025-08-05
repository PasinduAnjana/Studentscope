const pool = require("../db");

exports.getStudents = async () => {
  const result = await pool.query("SELECT * FROM students");
  return result.rows;
};

exports.getStudentById = async (id) => {
  const result = await pool.query("SELECT * FROM students WHERE id = $1", [id]);
  return result.rows[0];
};
