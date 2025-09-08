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
    index_number: `STU${String(row.id).padStart(4, "0")}`, // Generate index number from ID
    email: null, // email is no longer in DB
    age: null, // age is no longer in DB
    class_id: row.class_id,
    class_name: row.class_name,
    grade: row.grade,
  }));
};

// Get students by class ID
exports.getStudentsByClass = async (classId) => {
  const result = await pool.query(
    `
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
      AND u.class_id = $1
    ORDER BY u.username
  `,
    [classId]
  );

  // Map to previous returning format
  return result.rows.map((row) => ({
    id: row.id,
    name: row.username,
    index_number: `STU${String(row.id).padStart(4, "0")}`,
    email: null,
    age: null,
    class_id: row.class_id,
    class_name: row.class_name,
    grade: row.grade,
  }));
};

// Get all subjects
exports.getSubjects = async () => {
  const result = await pool.query(`
    SELECT id, name
    FROM subjects
    ORDER BY name
  `);

  return result.rows;
};

// Get class information by ID
exports.getClassInfo = async (classId) => {
  const result = await pool.query(
    `
    SELECT id, name, grade
    FROM classes
    WHERE id = $1
  `,
    [classId]
  );

  if (result.rows.length === 0) {
    throw new Error("Class not found");
  }

  return result.rows[0];
};

// Get all classes
exports.getAllClasses = async () => {
  const result = await pool.query(`
    SELECT id, name, grade
    FROM classes
    ORDER BY grade, name
  `);

  return result.rows;
};

// Get class subjects (mandatory subjects for a class)
exports.getClassSubjects = async (classId) => {
  const result = await pool.query(
    `
    SELECT 
      cs.id,
      cs.display_order,
      s.id AS subject_id,
      s.name,
      cs.is_common,
      cs.is_mandatory
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.class_id = $1
    ORDER BY cs.display_order, s.name
  `,
    [classId]
  );

  return result.rows;
};

// Get grade subject rules (how many electives allowed per grade)
exports.getGradeSubjectRules = async (grade) => {
  const result = await pool.query(
    `
    SELECT grade, elective_count
    FROM grade_subject_rules
    WHERE grade = $1
  `,
    [grade]
  );

  if (result.rows.length === 0) {
    // Return default if no rules found
    return { grade, elective_count: 0 };
  }

  return result.rows[0];
};

// Get student's current subject assignments
exports.getStudentSubjects = async (studentId) => {
  const result = await pool.query(
    `
    SELECT 
      ss.id,
      ss.subject_id,
      s.name AS subject_name
    FROM student_subjects ss
    JOIN subjects s ON ss.subject_id = s.id
    WHERE ss.student_id = $1
  `,
    [studentId]
  );

  return result.rows;
};

// Save student subject assignments
exports.saveStudentSubjects = async (studentId, subjectIds) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete existing assignments
    await client.query(
      `
      DELETE FROM student_subjects 
      WHERE student_id = $1
    `,
      [studentId]
    );

    // Insert new assignments
    if (subjectIds && subjectIds.length > 0) {
      const values = subjectIds
        .filter((id) => id) // Remove empty values
        .map((subjectId, index) => `($1, $${index + 2})`)
        .join(", ");

      if (values) {
        const query = `
          INSERT INTO student_subjects (student_id, subject_id)
          VALUES ${values}
        `;
        await client.query(query, [
          studentId,
          ...subjectIds.filter((id) => id),
        ]);
      }
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Save multiple students' subject assignments (for batch operations)
exports.saveMultipleStudentSubjects = async (assignments) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const assignment of assignments) {
      const { student_id, subject_ids } = assignment;

      // Delete existing assignments for this student
      await client.query(
        `
        DELETE FROM student_subjects 
        WHERE student_id = $1
      `,
        [student_id]
      );

      // Insert new assignments
      if (subject_ids && subject_ids.length > 0) {
        const validSubjectIds = subject_ids.filter((id) => id);
        if (validSubjectIds.length > 0) {
          const values = validSubjectIds
            .map((subjectId, index) => `($1, $${index + 2})`)
            .join(", ");

          const query = `
            INSERT INTO student_subjects (student_id, subject_id)
            VALUES ${values}
          `;
          await client.query(query, [student_id, ...validSubjectIds]);
        }
      }
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get available elective subjects for a grade (subjects not in class_subjects)
// Get available elective subjects for a class (from grade_subjects)
exports.getElectiveSubjects = async (classId) => {
  // 1️⃣ Get the grade for the class
  const classRes = await pool.query(`SELECT grade FROM classes WHERE id = $1`, [
    classId,
  ]);
  if (!classRes.rows.length) return [];
  const grade = classRes.rows[0].grade;

  // 2️⃣ Fetch elective subjects for this grade
  const result = await pool.query(
    `
    SELECT s.id, s.name
    FROM grade_subjects gs
    JOIN subjects s ON gs.subject_id = s.id
    WHERE gs.grade = $1
      AND gs.type = 'elective'
    ORDER BY gs.display_order, s.name
    `,
    [grade]
  );

  return result.rows; // directly return the elective subjects
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

// Get teacher's assigned classes
exports.getTeacherClasses = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT
      c.id,
      c.name,
      c.grade
    FROM classes c
    JOIN teacher_subjects ts ON c.id = ts.class_id
    WHERE ts.teacher_id = $1
    ORDER BY c.grade, c.name
  `,
    [teacherId]
  );

  return result.rows;
};

// Save attendance for a class on a given date
exports.saveClassAttendance = async (classId, dateStr, records) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Keep only valid students from this class
    const validRes = await client.query(
      `
        SELECT id FROM users
        WHERE class_id = $1
          AND role_id = (SELECT id FROM roles WHERE name = 'student')
      `,
      [classId]
    );
    const validIds = new Set(validRes.rows.map((r) => r.id));
    const filtered = (records || []).filter((r) => validIds.has(r.student_id));

    // Clear existing attendance entries for the class and date
    await client.query(
      `DELETE FROM attendance WHERE class_id = $1 AND date = $2`,
      [classId, dateStr]
    );

    if (filtered.length > 0) {
      const values = [];
      const placeholders = filtered
        .map((r, i) => {
          const base = i * 4;
          values.push(r.student_id, classId, dateStr, !!r.status);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");

      const insertQuery = `
        INSERT INTO attendance (student_id, class_id, date, status)
        VALUES ${placeholders}
      `;
      await client.query(insertQuery, values);
    }

    await client.query("COMMIT");
    return { success: true, inserted: (records || []).length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Get attendance for a class on a given date
exports.getClassAttendanceByDate = async (classId, dateStr) => {
  const result = await pool.query(
    `
    SELECT a.student_id, a.status
    FROM attendance a
    WHERE a.class_id = $1 AND a.date = $2
  `,
    [classId, dateStr]
  );
  // Map to { student_id, status }
  return result.rows.map((r) => ({
    student_id: r.student_id,
    status: r.status,
  }));
};

// Clear attendance for a class on a given date
exports.clearClassAttendance = async (classId, dateStr) => {
  const result = await pool.query(
    `DELETE FROM attendance WHERE class_id = $1 AND date = $2`,
    [classId, dateStr]
  );
  return { deleted: result.rowCount };
};
