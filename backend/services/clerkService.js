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

// Create a student user
async function createStudent({
  full_name,
  username,
  password, // optional; if not provided we'll use username as default password
  birthday,
  address,
  gender,
  nationality,
  class_id,
  parent_name,
  parent_address,
}) {
  // If no explicit password provided, use the username (index number) as the initial password
  const initialPassword = password && password.length ? password : username;
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(initialPassword, salt);

  // Get role_id for student
  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE name = 'student'"
  );
  if (!roleRes.rows.length) throw new Error("Role 'student' not found");
  const roleId = roleRes.rows[0].id;

  // Create or find parent (no ON CONFLICT because no unique constraint)
  let parentId = null;
  if (parent_name) {
    const parentSelect = await pool.query(
      `SELECT id FROM parents WHERE name = $1 AND address = $2`,
      [parent_name, parent_address || ""]
    );
    if (parentSelect.rows.length) {
      parentId = parentSelect.rows[0].id;
    } else {
      const parentInsert = await pool.query(
        `INSERT INTO parents (name, address) VALUES ($1, $2) RETURNING id`,
        [parent_name, parent_address || ""]
      );
      parentId = parentInsert.rows[0].id;
    }
  }

  // Insert into users table
  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, class_id`,
    [username, hashedPassword, salt, roleId, class_id]
  );
  const user = userResult.rows[0];

  // Insert into students table
  await pool.query(
    `INSERT INTO students (user_id, full_name, birthday, address, gender, nationality, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, full_name, birthday, address, gender, nationality, parentId]
  );

  return {
    id: user.id,
    username: user.username,
    full_name,
    birthday,
    address,
    gender,
    nationality,
    class_id: user.class_id,
    parent: parentId
      ? { id: parentId, name: parent_name, address: parent_address }
      : null,
  };
}

// Get all students with details
async function getAllStudents() {
  const result = await pool.query(`
    SELECT
      s.id,
      s.user_id,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      u.username,
      u.class_id,
      p.name as parent_name,
      p.address as parent_address
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN parents p ON s.parent_id = p.id
    ORDER BY s.full_name
  `);

  return result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    username: row.username,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    class_id: row.class_id,
    parent: row.parent_name
      ? {
          name: row.parent_name,
          address: row.parent_address,
        }
      : null,
  }));
}

// Get student by ID
async function getStudentById(id) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.user_id,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      u.username,
      u.class_id,
      p.name as parent_name,
      p.address as parent_address
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE s.id = $1
  `,
    [id]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    username: row.username,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    class_id: row.class_id,
    parent: row.parent_name
      ? {
          name: row.parent_name,
          address: row.parent_address,
        }
      : null,
  };
}

// Update student
async function updateStudent(
  id,
  {
    full_name,
    username,
    password,
    birthday,
    address,
    gender,
    nationality,
    class_id,
    parent_name,
    parent_address,
  }
) {
  // Get current student data
  const currentStudent = await getStudentById(id);
  if (!currentStudent) throw new Error("Student not found");

  // Update password if provided
  if (password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = hashPassword(password, salt);
    await pool.query(
      `UPDATE users SET password = $1, salt = $2 WHERE id = $3`,
      [hashedPassword, salt, currentStudent.user_id]
    );
  }

  // Update username and class_id if provided
  if (username || class_id) {
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (username) {
      updateFields.push(`username = $${paramCount++}`);
      updateValues.push(username);
    }
    if (class_id) {
      updateFields.push(`class_id = $${paramCount++}`);
      updateValues.push(class_id);
    }
    updateValues.push(currentStudent.user_id);

    await pool.query(
      `UPDATE users SET ${updateFields.join(", ")} WHERE id = $${paramCount}`,
      updateValues
    );
  }

  // Update or create parent (safe SELECT then INSERT)
  let parentId = currentStudent.parent?.id || null;
  if (parent_name) {
    const parentSelect = await pool.query(
      `SELECT id FROM parents WHERE name = $1 AND address = $2`,
      [parent_name, parent_address || ""]
    );
    if (parentSelect.rows.length) {
      parentId = parentSelect.rows[0].id;
    } else {
      const parentInsert = await pool.query(
        `INSERT INTO parents (name, address) VALUES ($1, $2) RETURNING id`,
        [parent_name, parent_address || ""]
      );
      parentId = parentInsert.rows[0].id;
    }
  }

  // Update student details
  const studentUpdateFields = [];
  const studentUpdateValues = [];
  let studentParamCount = 1;

  if (full_name !== undefined) {
    studentUpdateFields.push(`full_name = $${studentParamCount++}`);
    studentUpdateValues.push(full_name);
  }
  if (birthday !== undefined) {
    studentUpdateFields.push(`birthday = $${studentParamCount++}`);
    studentUpdateValues.push(birthday);
  }
  if (address !== undefined) {
    studentUpdateFields.push(`address = $${studentParamCount++}`);
    studentUpdateValues.push(address);
  }
  if (gender !== undefined) {
    studentUpdateFields.push(`gender = $${studentParamCount++}`);
    studentUpdateValues.push(gender);
  }
  if (nationality !== undefined) {
    studentUpdateFields.push(`nationality = $${studentParamCount++}`);
    studentUpdateValues.push(nationality);
  }
  if (parentId !== undefined) {
    studentUpdateFields.push(`parent_id = $${studentParamCount++}`);
    studentUpdateValues.push(parentId);
  }

  if (studentUpdateFields.length > 0) {
    studentUpdateValues.push(id);
    await pool.query(
      `UPDATE students SET ${studentUpdateFields.join(
        ", "
      )} WHERE id = $${studentParamCount}`,
      studentUpdateValues
    );
  }

  return await getStudentById(id);
}

// Delete student
async function deleteStudent(id) {
  const student = await getStudentById(id);
  if (!student) throw new Error("Student not found");

  // Start a transaction to ensure all deletions happen atomically
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete attendance records first (references users.id, not students.id)
    await client.query(`DELETE FROM attendance WHERE student_id = $1`, [
      student.user_id,
    ]);

    // Delete student subjects records (references users.id, not students.id)
    await client.query(`DELETE FROM student_subjects WHERE student_id = $1`, [
      student.user_id,
    ]);

    // Delete from students table
    await client.query(`DELETE FROM students WHERE id = $1`, [id]);

    // Delete from users table (this removes the username/class_id link)
    await client.query(`DELETE FROM users WHERE id = $1`, [student.user_id]);

    // Check if parent should be deleted (if no other students reference it)
    if (student.parent) {
      const parentCheck = await client.query(
        `SELECT COUNT(*) as count FROM students WHERE parent_id = $1`,
        [student.parent.id]
      );
      if (parentCheck.rows[0].count === 0) {
        // No other students reference this parent, safe to delete
        await client.query(`DELETE FROM parents WHERE id = $1`, [
          student.parent.id,
        ]);
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Get all classes
async function getAllClasses() {
  const result = await pool.query(`
    SELECT 
      c.id, 
      c.name, 
      c.grade,
      ct.teacher_id,
      td.full_name AS teacher_name
    FROM classes c
    LEFT JOIN class_teachers ct ON c.id = ct.class_id
    LEFT JOIN teacher_details td ON ct.teacher_id = td.teacher_id
    ORDER BY c.grade, c.name
  `);
  return result.rows.map((row) => ({
    id: row.id,
    class_name: row.name,
    grade: row.grade,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name || null,
  }));
}

async function getTeachers() {
  const result = await pool.query(`
    SELECT 
      u.id,
      td.full_name AS name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN teacher_details td ON u.id = td.teacher_id
    WHERE r.name = 'teacher'
    ORDER BY td.full_name
  `);
  return result.rows;
}

async function assignClassTeacher(classId, teacherId) {
  // First, remove any existing class teacher for this class
  await pool.query("DELETE FROM class_teachers WHERE class_id = $1", [classId]);

  // If teacherId is provided, assign the new teacher
  if (teacherId) {
    await pool.query(
      "INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2)",
      [classId, teacherId]
    );
  }
}

async function createClass(grade, className) {
  const result = await pool.query(
    "INSERT INTO classes (grade, name) VALUES ($1, $2) RETURNING id",
    [grade, className]
  );
  return result.rows[0].id;
}

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getAllClasses,
  getTeachers,
  assignClassTeacher,
  createClass,
};
