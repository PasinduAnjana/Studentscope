// Get weekly timetable for a teacher
// teacherId should come from authenticated user (req.user.id)
exports.getTeacherWeeklyTimetable = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT 
      t.day_of_week,
      t.slot AS period_number,
      s.name AS subject,
      c.name AS class_name,
      c.grade
    FROM timetables t
    JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN classes c ON ts.class_id = c.id
    WHERE ts.teacher_id = $1
    ORDER BY t.day_of_week, t.slot
    `,
    [teacherId]
  );

  // Map to frontend format
  return result.rows.map((row) => ({
    day_of_week: row.day_of_week,
    period_number: row.period_number,
    subject: row.subject,
    class_name: row.class_name,
    grade: row.grade,
  }));
};
const pool = require("../db");

// Get all students with class info
exports.getStudents = async () => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.username AS index_number,
      u.class_id,
      c.grade,
      c.name AS class_name,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      p.name AS parent_name,
      p.address AS parent_address
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY u.id
  `);

  return result.rows.map((row) => ({
    id: row.id,
    index_number: row.index_number,
    full_name: row.full_name,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    parent: {
      name: row.parent_name,
      address: row.parent_address,
    },
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
      u.username AS index_number,
      u.class_id,
      c.grade,
      c.name AS class_name,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      p.name AS parent_name,
      p.address AS parent_address
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
      AND u.class_id = $1
    ORDER BY u.username
  `,
    [classId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    index_number: row.index_number,
    full_name: row.full_name,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    parent: {
      name: row.parent_name,
      address: row.parent_address,
    },
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
    JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN classes c ON ts.class_id = c.id
    WHERE ts.teacher_id = $1
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

// Get teacher data for marks dashboard
exports.getTeacherMarksData = async (teacherId) => {
  // Get subject assignments
  const assignmentsResult = await pool.query(
    `
    SELECT 
      CONCAT(c.grade, c.name) AS class,
      s.name AS subject
    FROM teacher_subjects ts
    JOIN classes c ON ts.class_id = c.id
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.teacher_id = $1
    ORDER BY c.grade, c.name, s.name
    `,
    [teacherId]
  );

  const subjectAssignments = assignmentsResult.rows;

  // Determine class teacher - for now, the class with the most subjects assigned
  // If tie, pick the first alphabetically
  const classCounts = {};
  subjectAssignments.forEach((assignment) => {
    const className = assignment.class;
    classCounts[className] = (classCounts[className] || 0) + 1;
  });

  let classTeacherOf = null;
  let maxCount = 0;
  for (const [className, count] of Object.entries(classCounts)) {
    if (
      count > maxCount ||
      (count === maxCount && (!classTeacherOf || className < classTeacherOf))
    ) {
      maxCount = count;
      classTeacherOf = className;
    }
  }

  return {
    id: teacherId,
    classTeacherOf,
    subjectAssignments,
  };
};

// Get subjects that a teacher teaches for a specific class
exports.getTeacherClassSubjects = async (teacherId, classId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT
      s.id,
      s.name
    FROM teacher_subjects ts
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.teacher_id = $1 AND ts.class_id = $2
    ORDER BY s.name
    `,
    [teacherId, classId]
  );

  return result.rows;
};

// Get all subjects taught in a specific class (by any teacher)
exports.getAllClassSubjects = async (classId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT
      s.id,
      s.name
    FROM teacher_subjects ts
    JOIN subjects s ON ts.subject_id = s.id
    WHERE ts.class_id = $1
    ORDER BY s.name
    `,
    [classId]
  );

  return result.rows;
};

// Save marks for students
exports.saveMarks = async (marksData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const mark of marksData) {
      const { student_id, subject_id, mark: markValue, exam_type } = mark;

      if (markValue !== null && markValue !== undefined) {
        // Insert or update mark
        await client.query(
          `
          INSERT INTO marks (student_id, subject_id, marks, exam_type, year)
          VALUES ($1, $2, $3, $4, EXTRACT(YEAR FROM CURRENT_DATE))
          ON CONFLICT (student_id, subject_id, exam_type, year)
          DO UPDATE SET marks = EXCLUDED.marks
          `,
          [student_id, subject_id, markValue, exam_type]
        );
      }
    }

    await client.query("COMMIT");
    return { success: true, message: "Marks saved successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// Announcement functions
exports.getAnnouncementsByClass = async (classId) => {
  const result = await pool.query(
    `
    SELECT 
      a.id, 
      a.title, 
      a.description, 
      a.created_at,
      a.audience_type,
      u.username as posted_by_name
    FROM announcements a
    LEFT JOIN users u ON a.posted_by = u.id
    WHERE a.audience_type = 'students' 
      AND EXISTS (
        SELECT 1 FROM announcement_classes ac 
        WHERE ac.announcement_id = a.id AND ac.class_id = $1
      )
    ORDER BY a.created_at DESC
    `,
    [classId]
  );
  return result.rows;
};

exports.createAnnouncement = async ({
  title,
  description,
  audience_type,
  class_ids,
  teacher_id,
}) => {
  // For teachers, always set audience_type to 'students' and use their class
  const result = await pool.query(
    "INSERT INTO announcements (title, description, posted_by, audience_type, created_at) VALUES ($1, $2, $3, 'students', NOW()) RETURNING *",
    [title, description, teacher_id]
  );
  const announcement = result.rows[0];

  // Get teacher's class
  const classResult = await pool.query(
    "SELECT class_id FROM users WHERE id = $1",
    [teacher_id]
  );
  const teacherClassId = classResult.rows[0].class_id;

  // Insert into announcement_classes
  await pool.query(
    "INSERT INTO announcement_classes (announcement_id, class_id) VALUES ($1, $2)",
    [announcement.id, teacherClassId]
  );

  return announcement;
};

exports.updateAnnouncement = async (
  announcementId,
  { title, description },
  teacherId
) => {
  // Verify the teacher owns this announcement
  const checkResult = await pool.query(
    "SELECT id FROM announcements WHERE id = $1 AND posted_by = $2",
    [announcementId, teacherId]
  );
  if (checkResult.rows.length === 0) {
    throw new Error("Announcement not found or access denied");
  }

  const result = await pool.query(
    "UPDATE announcements SET title = $1, description = $2 WHERE id = $3 AND posted_by = $4 RETURNING *",
    [title, description, announcementId, teacherId]
  );
  return result.rows[0];
};

exports.deleteAnnouncement = async (announcementId, teacherId) => {
  // Verify the teacher owns this announcement
  const checkResult = await pool.query(
    "SELECT id FROM announcements WHERE id = $1 AND posted_by = $2",
    [announcementId, teacherId]
  );
  if (checkResult.rows.length === 0) {
    throw new Error("Announcement not found or access denied");
  }

  // Delete from link tables first (cascade should handle this, but being explicit)
  await pool.query(
    "DELETE FROM announcement_classes WHERE announcement_id = $1",
    [announcementId]
  );
  await pool.query(
    "DELETE FROM announcement_teachers WHERE announcement_id = $1",
    [announcementId]
  );

  // Delete the announcement
  const result = await pool.query(
    "DELETE FROM announcements WHERE id = $1 AND posted_by = $2",
    [announcementId, teacherId]
  );
  return result.rowCount > 0;
};

exports.getAnnouncementsForTeacher = async (teacherId) => {
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
    LEFT JOIN announcement_teachers at ON a.id = at.announcement_id
    WHERE a.audience_type = 'all'
       OR (a.audience_type = 'teachers' AND at.teacher_id = $1)
    ORDER BY a.created_at DESC
    `,
    [teacherId]
  );
  return result.rows;
};

exports.getAnnouncementsByTeacher = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT
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
    WHERE a.posted_by = $1
    ORDER BY a.created_at DESC
    `,
    [teacherId]
  );
  return result.rows;
};

// Get behavior records for teacher's class students created by this teacher
exports.getTeacherBehaviorRecords = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (br.id)
      br.id,
      br.student_id,
      br.class_id,
      br.type,
      br.severity,
      br.description,
      br.created_at::DATE as date,
      CONCAT(c.grade, c.name) as class,
      s.full_name as student,
      reporter.full_name as reported_by
    FROM behavior_records br
    JOIN classes c ON br.class_id = c.id
    JOIN teacher_subjects ts ON c.id = ts.class_id
    JOIN users u ON br.student_id = u.id
    JOIN students s ON u.id = s.user_id
    LEFT JOIN users reporter_u ON br.reported_by = reporter_u.id
    LEFT JOIN teacher_details reporter ON reporter_u.id = reporter.teacher_id
    WHERE ts.teacher_id = $1 AND br.reported_by = $1
    ORDER BY br.id, br.created_at DESC
    `,
    [teacherId]
  );
  return result.rows;
};

// Get all students from teacher's classes
exports.getStudentsFromTeacherClasses = async (teacherId) => {
  console.log("getStudentsFromTeacherClasses - teacherId:", teacherId);
  const result = await pool.query(
    `
    SELECT DISTINCT ON (u.id)
      u.id,
      u.username AS index_number,
      u.class_id,
      c.grade,
      c.name AS class_name,
      s.full_name,
      s.birthday,
      s.address,
      s.gender,
      s.nationality,
      p.name AS parent_name,
      p.address AS parent_address
    FROM classes c
    JOIN teacher_subjects ts ON c.id = ts.class_id
    JOIN users u ON u.class_id = c.id
    LEFT JOIN students s ON s.user_id = u.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE ts.teacher_id = $1
      AND u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY u.id, c.grade, c.name, u.username
    `,
    [teacherId]
  );

  console.log(
    "getStudentsFromTeacherClasses - result rows count:",
    result.rows.length
  );

  return result.rows.map((row) => ({
    id: row.id,
    index_number: row.index_number,
    full_name: row.full_name,
    birthday: row.birthday,
    address: row.address,
    gender: row.gender,
    nationality: row.nationality,
    class_id: row.class_id,
    grade: row.grade,
    class_name: row.class_name,
    parent: {
      name: row.parent_name,
      address: row.parent_address,
    },
  }));
};

// Todo Management Functions
// Get all todos for a teacher
exports.getTeacherTodos = async (teacherId) => {
  const result = await pool.query(
    `
    SELECT 
      id,
      text,
      status,
      created_at,
      updated_at
    FROM todos
    WHERE teacher_id = $1
    ORDER BY created_at DESC
    `,
    [teacherId]
  );

  return result.rows;
};

// Create a new todo
exports.createTodo = async (teacherId, text) => {
  const result = await pool.query(
    `
    INSERT INTO todos (teacher_id, text, status)
    VALUES ($1, $2, 'pending')
    RETURNING id, text, status, created_at, updated_at
    `,
    [teacherId, text]
  );

  return result.rows[0];
};

// Update a todo
exports.updateTodo = async (todoId, teacherId, text) => {
  const result = await pool.query(
    `
    UPDATE todos
    SET text = $1, updated_at = now()
    WHERE id = $2 AND teacher_id = $3
    RETURNING id, text, status, created_at, updated_at
    `,
    [text, todoId, teacherId]
  );

  return result.rows[0] || null;
};

// Delete a todo
exports.deleteTodo = async (todoId, teacherId) => {
  const result = await pool.query(
    `
    DELETE FROM todos
    WHERE id = $1 AND teacher_id = $2
    RETURNING id
    `,
    [todoId, teacherId]
  );

  return result.rows.length > 0;
};

// Update todo status
exports.updateTodoStatus = async (todoId, teacherId, status) => {
  if (!["pending", "completed"].includes(status)) {
    throw new Error("Invalid status. Must be 'pending' or 'completed'");
  }

  const result = await pool.query(
    `
    UPDATE todos
    SET status = $1, updated_at = now()
    WHERE id = $2 AND teacher_id = $3
    RETURNING id, text, status, created_at, updated_at
    `,
    [status, todoId, teacherId]
  );

  return result.rows[0] || null;
};

exports.changePassword = async (teacherId, oldPassword, newPassword) => {
  const crypto = require("crypto");

  // Get current user with password and salt
  const userResult = await pool.query(
    "SELECT password, salt FROM users WHERE id = $1",
    [teacherId]
  );

  if (userResult.rows.length === 0) {
    return { success: false, message: "User not found" };
  }

  const user = userResult.rows[0];

  // Hash the old password with the same method
  const hashedOldPassword = crypto
    .pbkdf2Sync(oldPassword, user.salt, 100000, 64, "sha512")
    .toString("hex");

  // Verify old password
  if (hashedOldPassword !== user.password) {
    return { success: false, message: "Old password is incorrect" };
  }

  // Generate new salt and hash new password
  const newSalt = crypto.randomBytes(16).toString("hex");
  const hashedNewPassword = crypto
    .pbkdf2Sync(newPassword, newSalt, 100000, 64, "sha512")
    .toString("hex");

  // Update password and salt
  await pool.query("UPDATE users SET password = $1, salt = $2 WHERE id = $3", [
    hashedNewPassword,
    newSalt,
    teacherId,
  ]);

  return { success: true, message: "Password changed successfully" };
};

exports.getPendingPasswordResets = async () => {
  try {
    const result = await pool.query(
      `SELECT prr.id, prr.user_id, prr.role, u.username, prr.created_at
       FROM password_reset_requests prr
       JOIN users u ON prr.user_id = u.id
       WHERE prr.status = 'pending' AND prr.role = 'student'
       ORDER BY prr.created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error("Error getting pending password resets:", err);
    return [];
  }
};

exports.approvePasswordReset = async (resetId, approverId) => {
  try {
    const resetResult = await pool.query(
      "SELECT * FROM password_reset_requests WHERE id = $1 AND status = 'pending'",
      [resetId]
    );

    if (resetResult.rows.length === 0) {
      return { success: false, error: "Reset request not found" };
    }

    const reset = resetResult.rows[0];

    if (reset.new_password && reset.new_salt) {
      // Update user password
      await pool.query(
        "UPDATE users SET password = $1, salt = $2 WHERE id = $3",
        [reset.new_password, reset.new_salt, reset.user_id]
      );
    }

    // Update reset request status
    await pool.query(
      "UPDATE password_reset_requests SET status = 'approved', approved_by = $1, approved_at = now() WHERE id = $2",
      [approverId, resetId]
    );

    return { success: true, message: "Password reset approved" };
  } catch (err) {
    console.error("Error approving password reset:", err);
    return { success: false, error: "Failed to approve password reset" };
  }
};

exports.rejectPasswordReset = async (resetId, rejectedBy) => {
  try {
    const resetResult = await pool.query(
      "SELECT * FROM password_reset_requests WHERE id = $1 AND status = 'pending'",
      [resetId]
    );

    if (resetResult.rows.length === 0) {
      return { success: false, error: "Reset request not found" };
    }

    // Update reset request status
    await pool.query(
      "UPDATE password_reset_requests SET status = 'rejected', approved_by = $1, approved_at = now() WHERE id = $2",
      [rejectedBy, resetId]
    );

    return { success: true, message: "Password reset rejected" };
  } catch (err) {
    console.error("Error rejecting password reset:", err);
    return { success: false, error: "Failed to reject password reset" };
  }
};
