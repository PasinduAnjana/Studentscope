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

// Get clerk details
exports.getClerkDetails = async function(userId) {
  const result = await pool.query(
    `SELECT full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, birthday
     FROM clerk_details WHERE clerk_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

exports.getTeacherById = async function(teacherId) {
  const result = await pool.query(
    `
    SELECT 
      td.teacher_id,
      td.full_name,
      td.nic,
      td.address,
      td.phone_number,
      td.past_schools,
      td.appointment_date,
      td.first_appointment_date,
      td.level,
      td.birthday
    FROM teacher_details td
    WHERE td.teacher_id = $1
  `,
    [teacherId]
  );
  return result.rows[0] || null;
}

exports.createTeacher = async function({
  full_name,
  nic,
  birthday,
  level,
  address,
  phone_number,
  past_schools,
  appointment_date,
  first_appointment_date,
}) {
  // Get role_id for teacher
  const roleRes = await pool.query(
    "SELECT id FROM roles WHERE name = 'teacher'"
  );
  if (!roleRes.rows.length) throw new Error("Role 'teacher' not found");
  const roleId = roleRes.rows[0].id;

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(nic, salt); // Use NIC as password

  // Insert into users table
  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [nic, hashedPassword, salt, roleId]
  );
  const userId = userResult.rows[0].id;

  // Insert into teacher_details table
  await pool.query(
    `INSERT INTO teacher_details (teacher_id, full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, level, birthday)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      userId,
      full_name,
      nic,
      address,
      phone_number,
      past_schools,
      appointment_date,
      first_appointment_date,
      level,
      birthday,
    ]
  );

  return {
    teacher_id: userId,
    full_name,
    nic,
    birthday,
    level,
    address,
    phone_number,
    past_schools,
    appointment_date,
    first_appointment_date,
  };
}

exports.updateTeacher = async function(
  teacherId,
  {
    full_name,
    nic,
    birthday,
    level,
    address,
    phone_number,
    past_schools,
    appointment_date,
    first_appointment_date,
  }
) {
  // Update teacher_details
  const result = await pool.query(
    `UPDATE teacher_details SET
      full_name = $1,
      nic = $2,
      birthday = $3,
      level = $4,
      address = $5,
      phone_number = $6,
      past_schools = $7,
      appointment_date = $8,
      first_appointment_date = $9
     WHERE teacher_id = $10
     RETURNING *`,
    [
      full_name,
      nic,
      birthday,
      level,
      address,
      phone_number,
      past_schools,
      appointment_date,
      first_appointment_date,
      teacherId,
    ]
  );

  if (result.rows.length === 0) {
    return null;
  }

  // Update username in users table if NIC changed
  await pool.query("UPDATE users SET username = $1 WHERE id = $2", [
    nic,
    teacherId,
  ]);

  return result.rows[0];
}

exports.deleteTeacher = async function(teacherId) {
  // Delete from timetables (via teacher_subjects)
  await pool.query(
    "DELETE FROM timetables WHERE teacher_subject_id IN (SELECT id FROM teacher_subjects WHERE teacher_id = $1)",
    [teacherId]
  );

  // Delete from teacher_subjects
  await pool.query("DELETE FROM teacher_subjects WHERE teacher_id = $1", [
    teacherId,
  ]);

  // Delete from class_teachers
  await pool.query("DELETE FROM class_teachers WHERE teacher_id = $1", [
    teacherId,
  ]);

  // Delete from announcements
  await pool.query("DELETE FROM announcements WHERE posted_by = $1", [
    teacherId,
  ]);

  // Update behavior records to set reported_by to NULL (preserve historical data)
  await pool.query(
    "UPDATE behavior_records SET reported_by = NULL WHERE reported_by = $1",
    [teacherId]
  );

  // Delete from sessions
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [teacherId]);

  // Delete from teacher_details
  const result = await pool.query(
    "DELETE FROM teacher_details WHERE teacher_id = $1 RETURNING teacher_id",
    [teacherId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  // Delete from users table
  await pool.query("DELETE FROM users WHERE id = $1", [teacherId]);

  return true;
}

// Get timetable for a class
exports.getTimetableForClass = async (classId) => {
  const result = await pool.query(
    `
    SELECT 
      t.day_of_week,
      t.slot AS period_number,
      s.id AS subject_id,
      s.name AS subject,
      ts.teacher_id,
      td.full_name AS teacher_name
    FROM timetables t
    JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN teacher_details td ON ts.teacher_id = td.teacher_id
    WHERE ts.class_id = $1
    ORDER BY t.day_of_week, t.slot
    `,
    [classId]
  );

  return result.rows.map((row) => ({
    day_of_week: row.day_of_week,
    period_number: row.period_number,
    subject_id: row.subject_id,
    subject: row.subject,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
  }));
};

// Assign timetable slot
exports.assignTimetableSlot = async (
  class_id,
  day_of_week,
  period_number,
  subject_id,
  teacher_id
) => {
  // First, get or create teacher_subject
  let teacherSubjectResult = await pool.query(
    "SELECT id FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3",
    [teacher_id, subject_id, class_id]
  );

  let teacherSubjectId;
  if (teacherSubjectResult.rows.length > 0) {
    teacherSubjectId = teacherSubjectResult.rows[0].id;
  } else {
    const insertResult = await pool.query(
      "INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES ($1, $2, $3) RETURNING id",
      [teacher_id, subject_id, class_id]
    );
    teacherSubjectId = insertResult.rows[0].id;
  }

  // Delete existing assignment for this slot and class
  await pool.query(
    "DELETE FROM timetables WHERE teacher_subject_id IN (SELECT id FROM teacher_subjects WHERE class_id = $1) AND day_of_week = $2 AND slot = $3",
    [class_id, day_of_week, period_number]
  );

  // Insert new assignment
  await pool.query(
    "INSERT INTO timetables (teacher_subject_id, day_of_week, slot) VALUES ($1, $2, $3)",
    [teacherSubjectId, day_of_week, period_number]
  );
};

// ---------------------------
// Events
exports.createEvent = async (data, userId) => {
  const { title, description, event_date, target_audience } = data;
  const result = await pool.query(
    "INSERT INTO events (title, description, event_date, created_by, target_audience) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [title, description, event_date, userId, target_audience]
  );
  return result.rows[0];
};

exports.getEvents = async () => {
  const result = await pool.query(`
    SELECT e.*, u.username as creator_name, r.name as creator_role 
    FROM events e 
    JOIN users u ON e.created_by = u.id
    JOIN roles r ON u.role_id = r.id
    ORDER BY e.event_date ASC
  `);
  return result.rows;
};

exports.deleteEvent = async (id) => {
  await pool.query("DELETE FROM events WHERE id = $1", [id]);
};

// ---------------------------
// Subjects
exports.getSubjects = async () => {
  const result = await pool.query(
    "SELECT id AS subject_id, name AS subject_name FROM subjects ORDER BY name"
  );
  return result.rows;
};

// Announcement functions
exports.getAllAnnouncements = async (clerkId) => {
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
    [clerkId]
  );
  return result.rows;
};

exports.createAnnouncement = async ({
  title,
  description,
  audience_type,
  teacher_ids = [],
  class_ids = [],
  clerk_ids = [],
  clerk_id,
}) => {
  const result = await pool.query(
    "INSERT INTO announcements (title, description, posted_by, audience_type, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
    [title, description, clerk_id, audience_type]
  );
  const announcement = result.rows[0];

  // Insert into link tables based on audience type
  if (audience_type === "teachers" && teacher_ids.length > 0) {
    for (const teacherId of teacher_ids) {
      await pool.query(
        "INSERT INTO announcement_teachers (announcement_id, teacher_id) VALUES ($1, $2)",
        [announcement.id, teacherId]
      );
    }
  } else if (audience_type === "students" && class_ids.length > 0) {
    for (const classId of class_ids) {
      await pool.query(
        "INSERT INTO announcement_classes (announcement_id, class_id) VALUES ($1, $2)",
        [announcement.id, classId]
      );
    }
  } else if (audience_type === "clerks" && clerk_ids.length > 0) {
    for (const clerkIdValue of clerk_ids) {
      await pool.query(
        "INSERT INTO announcement_clerks (announcement_id, clerk_id) VALUES ($1, $2)",
        [announcement.id, clerkIdValue]
      );
    }
  }
  // For 'all', 'all-teachers', no need to insert into link tables

  return announcement;
};

exports.updateAnnouncement = async (
  announcementId,
  {
    title,
    description,
    audience_type,
    teacher_ids = [],
    class_ids = [],
    clerk_ids = [],
  },
  clerkId
) => {
  // Verify the clerk has access (clerks can edit any announcement they created)
  const checkResult = await pool.query(
    "SELECT id FROM announcements WHERE id = $1 AND posted_by = $2",
    [announcementId, clerkId]
  );
  if (checkResult.rows.length === 0) {
    throw new Error("Announcement not found or access denied");
  }

  // Update the announcement
  const result = await pool.query(
    "UPDATE announcements SET title = $1, description = $2, audience_type = $3 WHERE id = $4 AND posted_by = $5 RETURNING *",
    [title, description, audience_type, announcementId, clerkId]
  );

  if (result.rows.length === 0) {
    throw new Error("Announcement not found");
  }

  // Delete existing links
  await pool.query(
    "DELETE FROM announcement_teachers WHERE announcement_id = $1",
    [announcementId]
  );
  await pool.query(
    "DELETE FROM announcement_classes WHERE announcement_id = $1",
    [announcementId]
  );
  await pool.query(
    "DELETE FROM announcement_clerks WHERE announcement_id = $1",
    [announcementId]
  );

  // Insert new links based on audience type
  if (audience_type === "teachers" && teacher_ids.length > 0) {
    for (const teacherId of teacher_ids) {
      await pool.query(
        "INSERT INTO announcement_teachers (announcement_id, teacher_id) VALUES ($1, $2)",
        [announcementId, teacherId]
      );
    }
  } else if (audience_type === "students" && class_ids.length > 0) {
    for (const classId of class_ids) {
      await pool.query(
        "INSERT INTO announcement_classes (announcement_id, class_id) VALUES ($1, $2)",
        [announcementId, classId]
      );
    }
  } else if (audience_type === "clerks" && clerk_ids.length > 0) {
    for (const clerkIdValue of clerk_ids) {
      await pool.query(
        "INSERT INTO announcement_clerks (announcement_id, clerk_id) VALUES ($1, $2)",
        [announcementId, clerkIdValue]
      );
    }
  }

  return result.rows[0];
};

exports.deleteAnnouncement = async (announcementId, clerkId) => {
  // Verify the clerk has access
  const checkResult = await pool.query(
    "SELECT id FROM announcements WHERE id = $1 AND posted_by = $2",
    [announcementId, clerkId]
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
    [announcementId, clerkId]
  );
  return result.rowCount > 0;
};

exports.getAnnouncementWithDetails = async (announcementId) => {
  const result = await pool.query(
    `
    SELECT
      a.*,
      u.username as posted_by_name,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', t.id, 'full_name', t.full_name, 'username', t.username)) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) as teachers,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', c.id, 'grade', c.grade, 'name', c.name)) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) as classes
    FROM announcements a
    LEFT JOIN users u ON a.posted_by = u.id
    LEFT JOIN announcement_teachers at ON a.id = at.announcement_id
    LEFT JOIN users t ON at.teacher_id = t.id
    LEFT JOIN announcement_classes ac ON a.id = ac.announcement_id
    LEFT JOIN classes c ON ac.class_id = c.id
    WHERE a.id = $1
    GROUP BY a.id, u.username
    `,
    [announcementId]
  );
  return result.rows[0];
};

// Get announcements created by staff (teachers and clerks) for admin visibility
exports.getStaffAnnouncements = async () => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.created_at,
        a.audience_type,
        u.username as created_by_name,
        r.name as created_by_role,
        CASE
          WHEN a.audience_type = 'all' THEN 'All (Teachers & Students)'
          WHEN a.audience_type = 'teachers' THEN 'Teachers'
          WHEN a.audience_type = 'students' THEN 'Students'
        END as audience_display
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('teacher', 'clerk')
      ORDER BY a.created_at DESC
      `
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching staff announcements:", err);
    return [];
  }
};

// Get announcements for a specific clerk (including "all" and "clerks" audience)
exports.getAnnouncementsForClerk = async (clerkId) => {
  try {
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.created_at,
        a.audience_type,
        u.username as created_by_name,
        r.name as created_by_role
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 
        a.audience_type = 'all'
        OR (a.audience_type = 'clerks' AND EXISTS (
          SELECT 1 FROM announcement_clerks ac WHERE ac.announcement_id = a.id AND ac.clerk_id = $1
        ))
      ORDER BY a.created_at DESC
      `,
      [clerkId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching announcements for clerk:", err);
    return [];
  }
};

exports.assignTeacherToClass = async function(grade, className, teacherId) {
  // Find the class by grade and name
  let classResult = await pool.query(
    "SELECT id FROM classes WHERE grade = $1 AND name = $2",
    [grade, className]
  );

  let classId;
  if (classResult.rows.length === 0) {
    // Class doesn't exist, create it
    classId = await exports.createClass(grade, className);
  } else {
    classId = classResult.rows[0].id;
  }

  await exports.assignClassTeacher(classId, teacherId);
  return classId;
}

exports.deleteClass = async function(classId) {
  // Check if class exists
  const classResult = await pool.query("SELECT id FROM classes WHERE id = $1", [
    classId,
  ]);
  if (classResult.rows.length === 0) {
    throw new Error("Class not found");
  }

  // Check if there are students in the class
  const studentCount = await pool.query(
    `SELECT COUNT(*) FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.class_id = $1 AND r.name = 'student'`,
    [classId]
  );
  if (parseInt(studentCount.rows[0].count) > 0) {
    throw new Error("Cannot delete class with students assigned");
  }

  // Delete class teacher assignments first
  await pool.query("DELETE FROM class_teachers WHERE class_id = $1", [classId]);

  // Unassign any teachers linked to this class in the users table
  // We already checked for students, so these must be teachers
  await pool.query(
    "UPDATE users SET class_id = NULL, is_class_teacher = FALSE WHERE class_id = $1",
    [classId]
  );

  // Delete the class
  await pool.query("DELETE FROM classes WHERE id = $1", [classId]);

  return true;
}

// ... existing code ...



// Password reset functions
exports.getPendingPasswordResets = async function() {
  try {
    const result = await pool.query(
      `SELECT prr.id, prr.user_id, prr.role, u.username, prr.created_at
       FROM password_reset_requests prr
       JOIN users u ON prr.user_id = u.id
       WHERE prr.status = 'pending' AND prr.role = 'admin'
       ORDER BY prr.created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error("Error getting pending password resets:", err);
    return [];
  }
}

exports.approvePasswordReset = async function(resetId, approverId) {
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
}

exports.rejectPasswordReset = async function(rejectedBy) {
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
}

// Exam Management

// Get exams for a specific year (default: all)
exports.getExams = async function(year) {
  let query = `SELECT id, name, type, sub_type, year, target_grade FROM exams WHERE type = 'gov'`;
  const params = [];
  if (year) {
    query += ` AND year = $1`;
    params.push(year);
  }
  query += ` ORDER BY year DESC, name ASC`;
  const result = await pool.query(query, params);
  return result.rows;
}

// Create a new exam
exports.createExam = async function({ name, type = 'gov', sub_type, year, target_grade }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create the exam
    const res = await client.query(
      `INSERT INTO exams (name, type, sub_type, year, target_grade)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, type, sub_type, year, target_grade]
    );
    const exam = res.rows[0];

    // 2. If it's a government exam with a target grade, auto-assign students
    if (type === 'gov' && target_grade) {
      // Find students in that grade
      const studentsRes = await client.query(`
          SELECT u.id 
          FROM users u
          JOIN classes c ON u.class_id = c.id
          WHERE c.grade = $1
       `, [target_grade]);

      const students = studentsRes.rows;
      if (students.length > 0) {
        for (const s of students) {
          await client.query(`
                   INSERT INTO exam_students (exam_id, student_id)
                   VALUES ($1, $2)
                   ON CONFLICT DO NOTHING
               `, [exam.id, s.id]);
        }
      }
    }

    await client.query("COMMIT");
    return exam;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Assign students to exam
exports.assignStudentsToExam = async function(examId, studentIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const studentId of studentIds) {
      await client.query(
        `INSERT INTO exam_students (exam_id, student_id) 
          VALUES ($1, $2)
          ON CONFLICT (exam_id, student_id) DO NOTHING`,
        [examId, studentId]
      );
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Get students assigned to an exam
exports.getExamStudents = async function(examId) {
  // Check exam type first
  const examRes = await pool.query("SELECT type, target_grade FROM exams WHERE id = $1", [examId]);
  if (!examRes.rows.length) return [];
  const { type, target_grade } = examRes.rows[0];

  if (type !== 'gov') {
    // For term tests, return all students (optionally filtered by target_grade if set)
    let query = `
        SELECT 
          u.id as student_id,
          u.username as index_number,
          u.username,
          s.full_name,
          c.grade,
          c.name as class_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON u.class_id = c.id
     `;
    const params = [];
    if (target_grade) {
      query += ` WHERE c.grade = $1`;
      params.push(target_grade);
    }
    query += ` ORDER BY c.grade, c.name, s.full_name`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  const result = await pool.query(`
    SELECT 
      es.student_id,
      es.index_number,
      u.username,
      s.full_name,
      c.grade,
      c.name as class_name
    FROM exam_students es
    JOIN users u ON es.student_id = u.id
    JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE es.exam_id = $1
    ORDER BY c.grade, c.name, s.full_name
  `, [examId]);
  return result.rows;
}

// Save marks for an exam
exports.saveExamMarks = async function(examId, marksData) {
  // marksData: [{ student_id, subject_id, mark }]
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if this is a Grade 5 exam (where subject_id might be null)
    const examRes = await client.query(
      `SELECT name, sub_type, target_grade FROM exams WHERE id = $1`, [examId]
    );
    let grade5SubjectId = null;
    if (examRes.rows.length) {
      const examRow = examRes.rows[0];
      // Derive sub_type from name if not set
      if (!examRow.sub_type) {
        if (examRow.name && examRow.name.includes('A/L')) examRow.sub_type = 'AL';
        else if (examRow.name && examRow.name.includes('O/L')) examRow.sub_type = 'OL';
        else if (examRow.name && (examRow.name.includes('Grade 5') || examRow.name.includes('Scholarship'))) examRow.sub_type = 'Grade5';
      }
      if (examRow.sub_type === 'Grade5') {
        // Get first compulsory subject for grade 5 as the "total" subject
        const subRes = await client.query(
          `SELECT cs.subject_id FROM class_subjects cs
         JOIN classes c ON cs.class_id = c.id
         WHERE c.grade = 5
         ORDER BY cs.display_order LIMIT 1`
        );
        if (subRes.rows.length) grade5SubjectId = subRes.rows[0].subject_id;
      }
    }

    for (const entry of marksData) {
      if (entry.mark !== undefined && entry.mark !== null) {
        const subjectId = entry.subject_id || grade5SubjectId;
        if (!subjectId) continue; // Skip if we still can't resolve subject
        await client.query(
          `INSERT INTO marks (student_id, subject_id, exam_id, marks)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (student_id, subject_id, exam_id) 
            DO UPDATE SET marks = EXCLUDED.marks`,
          [entry.student_id, subjectId, examId, entry.mark]
        );
      }
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Get marks for an exam and subject
exports.getExamMarks = async function(examId, subjectId) {
  const result = await pool.query(`
    SELECT student_id, marks 
    FROM marks 
    WHERE exam_id = $1 AND subject_id = $2
  `, [examId, subjectId]);
  return result.rows;
}

// Update exam index number for a student
exports.updateExamStudentIndex = async function(examId, studentId, indexNumber) {
  const result = await pool.query(
    `UPDATE exam_students 
     SET index_number = $1
     WHERE exam_id = $2 AND student_id = $3
     RETURNING *`,
    [indexNumber, examId, studentId]
  );
  return result.rows[0];
}

// Bulk update exam index numbers from CSV data
exports.bulkUpdateExamIndexNumbers = async function(examId, entries) {
  // entries: [{ admission_no, index_number }]
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let updated = 0;
    let notFound = [];

    for (const entry of entries) {
      // Find student by admission number (username)
      const studentRes = await client.query(
        `SELECT es.student_id FROM exam_students es
         JOIN users u ON es.student_id = u.id
         WHERE es.exam_id = $1 AND u.username = $2`,
        [examId, entry.admission_no]
      );

      if (studentRes.rows.length === 0) {
        notFound.push(entry.admission_no);
        continue;
      }

      await client.query(
        `UPDATE exam_students SET index_number = $1
         WHERE exam_id = $2 AND student_id = $3`,
        [entry.index_number, examId, studentRes.rows[0].student_id]
      );
      updated++;
    }

    await client.query("COMMIT");
    return { updated, notFound };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Get subjects/columns for an exam based on its type
exports.getExamSubjects = async function(examId) {
  // Get exam info
  const examRes = await pool.query(
    `SELECT id, name, type, sub_type, target_grade FROM exams WHERE id = $1`,
    [examId]
  );
  if (!examRes.rows.length) return { columns: [], examType: null };
  const exam = examRes.rows[0];

  // Derive sub_type from name if not set
  if (!exam.sub_type) {
    if (exam.name && exam.name.includes('A/L')) exam.sub_type = 'AL';
    else if (exam.name && exam.name.includes('O/L')) exam.sub_type = 'OL';
    else if (exam.name && (exam.name.includes('Grade 5') || exam.name.includes('Scholarship'))) exam.sub_type = 'Grade5';
  }

  if (exam.sub_type === 'Grade5') {
    // Grade 5 Scholarship: single total mark out of 200
    return {
      examType: 'Grade5',
      maxMark: 200,
      columns: [{ key: 'total', header: 'Total (out of 200)', subject_id: null, type: 'total' }]
    };
  }

  if (exam.sub_type === 'OL') {
    // O/L: 6 compulsory class_subjects for grade 11 + 3 bucket electives
    // Get compulsory subjects
    const compRes = await pool.query(
      `SELECT DISTINCT s.id AS subject_id, s.name, cs.display_order
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN classes c ON cs.class_id = c.id
       WHERE c.grade = 11
       ORDER BY cs.display_order`,
      []
    );

    const columns = compRes.rows.map(r => ({
      key: `subj_${r.subject_id}`,
      header: r.name,
      subject_id: r.subject_id,
      type: 'compulsory'
    }));

    // Get bucket info for grade 10-11 electives
    const bucketRes = await pool.query(
      `SELECT DISTINCT gs.bucket_id
       FROM grade_subjects gs
       WHERE gs.grade = 11 AND gs.type = 'elective' AND gs.bucket_id > 0
       ORDER BY gs.bucket_id`,
      []
    );

    bucketRes.rows.forEach(b => {
      columns.push({
        key: `bucket_${b.bucket_id}`,
        header: `Elective ${b.bucket_id}`,
        bucket_id: b.bucket_id,
        type: 'bucket'
      });
    });

    return { examType: 'OL', maxMark: 100, columns };
  }

  if (exam.sub_type === 'AL') {
    // A/L: 3 elective buckets + Common General Test + General English
    // Get compulsory subjects for grade 12-13 (General English, Common General Test)
    const compRes = await pool.query(
      `SELECT DISTINCT s.id AS subject_id, s.name, cs.display_order
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN classes c ON cs.class_id = c.id
       WHERE c.grade = 13
       ORDER BY cs.display_order`,
      []
    );

    const columns = [];

    // Add 3 elective buckets first
    const bucketRes = await pool.query(
      `SELECT DISTINCT gs.bucket_id
       FROM grade_subjects gs
       WHERE gs.grade = 13 AND gs.type = 'elective' AND gs.bucket_id > 0
       ORDER BY gs.bucket_id`,
      []
    );

    bucketRes.rows.forEach(b => {
      columns.push({
        key: `bucket_${b.bucket_id}`,
        header: `Subject ${b.bucket_id}`,
        bucket_id: b.bucket_id,
        type: 'bucket'
      });
    });

    // Add compulsory subjects (Common General Test, General English)
    compRes.rows.forEach(r => {
      columns.push({
        key: `subj_${r.subject_id}`,
        header: r.name,
        subject_id: r.subject_id,
        type: 'compulsory'
      });
    });

    return { examType: 'AL', maxMark: 100, columns };
  }

  return { examType: exam.sub_type, maxMark: 100, columns: [] };
}

// Get all marks for all students in an exam
exports.getAllExamMarks = async function(examId) {
  const result = await pool.query(
    `SELECT m.student_id, m.subject_id, m.marks
     FROM marks m
     WHERE m.exam_id = $1`,
    [examId]
  );

  // Also get each student's elected subjects (to know which bucket subject they chose)
  const studentSubjects = await pool.query(
    `SELECT ss.student_id, ss.subject_id, gs.bucket_id, s.name AS subject_name
     FROM student_subjects ss
     JOIN grade_subjects gs ON ss.subject_id = gs.subject_id
     JOIN subjects s ON ss.subject_id = s.id
     JOIN exam_students es ON es.student_id = ss.student_id AND es.exam_id = $1
     JOIN exams e ON e.id = $1
     WHERE gs.grade = e.target_grade AND gs.type = 'elective'`,
    [examId]
  );

  // Build a map: student_id -> { bucket_id: subject_id }
  const studentElectiveMap = {};
  const subjectNames = {};
  studentSubjects.rows.forEach(r => {
    if (!studentElectiveMap[r.student_id]) studentElectiveMap[r.student_id] = {};
    studentElectiveMap[r.student_id][r.bucket_id] = r.subject_id;
    subjectNames[r.subject_id] = r.subject_name;
  });

  return {
    marks: result.rows,
    studentElectives: studentElectiveMap,
    subjectNames
  };
}
