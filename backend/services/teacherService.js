const pool = require("../db");

exports.getStudents = async () => {
  const result = await pool.query("SELECT * FROM students");
  return result.rows;
};
