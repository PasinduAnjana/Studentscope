const pool = require("../db");

exports.create = async (data) => {
  const { student_id, title, description, category, achieved_at } = data;
  const result = await pool.query(
    `INSERT INTO achievements (student_id, title, description, category, achieved_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [student_id, title, description, category, achieved_at]
  );
  return result.rows[0];
};

exports.getAll = async () => {
  const result = await pool.query(
    "SELECT * FROM achievements ORDER BY achieved_at DESC"
  );
  return result.rows;
};

exports.getAllWithStudentDetails = async () => {
  const result = await pool.query(`
    SELECT a.*, s.full_name as student_name, s.user_id as student_user_id
    FROM achievements a
    JOIN users u ON a.student_id = u.id
    JOIN students s ON s.user_id = u.id
    ORDER BY a.achieved_at DESC
  `);
  return result.rows;
};

exports.getByStudent = async (studentId) => {
  const result = await pool.query(
    "SELECT * FROM achievements WHERE student_id = $1 ORDER BY achieved_at DESC",
    [studentId]
  );
  return result.rows;
};

exports.update = async (id, data) => {
  const { title, description, category, achieved_at } = data;
  const result = await pool.query(
    `UPDATE achievements
     SET title = $1, description = $2, category = $3, achieved_at = $4
     WHERE id = $5
     RETURNING *`,
    [title, description, category, achieved_at, id]
  );
  return result.rows[0];
};

exports.delete = async (id) => {
  await pool.query("DELETE FROM achievements WHERE id = $1", [id]);
  return true;
};