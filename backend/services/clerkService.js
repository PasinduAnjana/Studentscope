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
  // Handle empty date strings - convert to null
  const safeBirthday = birthday === "" ? null : birthday;
  const safeAppointmentDate = appointment_date === "" ? null : appointment_date;
  const safeFirstAppointmentDate = first_appointment_date === "" ? null : first_appointment_date;

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
      safeAppointmentDate,
      safeFirstAppointmentDate,
      level,
      safeBirthday,
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
  // Handle empty date strings - convert to null
  const safeBirthday = birthday === "" ? null : birthday;
  const safeAppointmentDate = appointment_date === "" ? null : appointment_date;
  const safeFirstAppointmentDate = first_appointment_date === "" ? null : first_appointment_date;

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
      safeBirthday,
      level,
      address,
      phone_number,
      past_schools,
      safeAppointmentDate,
      safeFirstAppointmentDate,
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

exports.createClass = async (grade, className) => {
  const result = await pool.query(
    "INSERT INTO classes (grade, name) VALUES ($1, $2) RETURNING id",
    [grade, className]
  );
  return result.rows[0].id;
};

exports.assignClassTeacher = async function(classId, teacherId) {
  // Update the teacher's class_id and is_class_teacher flag
  await pool.query(
    "UPDATE users SET class_id = $1, is_class_teacher = TRUE WHERE id = $2",
    [classId, teacherId]
  );

  // Add to class_teachers table
  await pool.query(
    "INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [classId, teacherId]
  );
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

exports.rejectPasswordReset = async function(resetId, rejectedBy) {
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
};

exports.getClerkAlerts = async () => {
  const alerts = [];

  const noParent = await pool.query(`
    SELECT COUNT(*) as count FROM students s WHERE s.parent_id IS NULL
  `);
  const noParentCount = parseInt(noParent.rows[0].count);
  if (noParentCount > 0) {
    alerts.push({
      key: "no_parent", type: "warning", icon: "fas fa-user-slash",
      message: { en: "Students without guardian info", si: "භාරකරු තොරතුරු නැති සිසුන්", ta: "பாதுகாவலர் தகவல் இல்லாத மாணவர்கள்" },
      count: noParentCount,
    });
  }

  const noClass = await pool.query(`
    SELECT COUNT(*) as count FROM users u
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student') AND u.class_id IS NULL
  `);
  const noClassCount = parseInt(noClass.rows[0].count);
  if (noClassCount > 0) {
    alerts.push({
      key: "no_class", type: "warning", icon: "fas fa-user-xmark",
      message: { en: "Students not assigned to a class", si: "පන්තියකට පවරා නැති සිසුන්", ta: "வகுப்பு ஒதுக்கப்படாத மாணவர்கள்" },
      count: noClassCount,
    });
  }

  const noTeacher = await pool.query(`
    SELECT COUNT(*) as count FROM classes c WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
  `);
  const noTeacherCount = parseInt(noTeacher.rows[0].count);
  if (noTeacherCount > 0) {
    alerts.push({
      key: "no_teacher", type: "info", icon: "fas fa-chalkboard",
      message: { en: "Classes without a teacher", si: "ගුරුවරයෙකු නැති පන්ති", ta: "ஆசிரியர் இல்லாத வகுப்புகள்" },
      count: noTeacherCount,
    });
  }

  const noIndex = await pool.query(`
    SELECT COUNT(*) as count FROM exam_students es JOIN exams e ON es.exam_id = e.id
    WHERE es.index_number IS NULL OR es.index_number = ''
  `);
  const noIndexCount = parseInt(noIndex.rows[0].count);
  if (noIndexCount > 0) {
    alerts.push({
      key: "no_index", type: "danger", icon: "fas fa-hashtag",
      message: { en: "Exam entries missing index numbers", si: "සුචිගත අංක නැති විභාග ඇතුළත් කිරීම්", ta: "குறியீட்டு எண் இல்லாத தேர்வு பதிவுகள்" },
      count: noIndexCount,
    });
  }

  const noBirthday = await pool.query(`
    SELECT COUNT(*) as count FROM students s WHERE s.birthday IS NULL
  `);
  const noBirthdayCount = parseInt(noBirthday.rows[0].count);
  if (noBirthdayCount > 0) {
    alerts.push({
      key: "no_birthday", type: "info", icon: "fas fa-cake-candles",
      message: { en: "Students missing birthday", si: "උපන්දිනය නැති සිසුන්", ta: "பிறந்த நாள் இல்லாத மாணவர்கள்" },
      count: noBirthdayCount,
    });
  }

  const noTimetable = await pool.query(`
    SELECT COUNT(*) as count FROM classes c WHERE c.id NOT IN (
      SELECT DISTINCT ts.class_id FROM timetables t JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
    )
  `);
  const noTimetableCount = parseInt(noTimetable.rows[0].count);
  if (noTimetableCount > 0) {
    alerts.push({
      key: "no_timetable", type: "warning", icon: "fas fa-calendar-times",
      message: { en: "Classes without a timetable", si: "කාලසටහනක් නැති පන්ති", ta: "நேர அட்டவணை இல்லாத வகுப்புகள்" },
      count: noTimetableCount,
    });
  }

  const noSubjects = await pool.query(`
    SELECT COUNT(*) as count FROM users u
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'teacher')
    AND u.id NOT IN (SELECT teacher_id FROM teacher_subjects)
  `);
  const noSubjectsCount = parseInt(noSubjects.rows[0].count);
  if (noSubjectsCount > 0) {
    alerts.push({
      key: "no_subjects", type: "info", icon: "fas fa-book-open",
      message: { en: "Teachers without assigned subjects", si: "විෂයයන් පවරා නැති ගුරුවරුන්", ta: "பாடம் ஒதுக்கப்படாத ஆசிரியர்கள்" },
      count: noSubjectsCount,
    });
  }

  const noAddress = await pool.query(`
    SELECT COUNT(*) as count FROM students s WHERE s.address IS NULL OR s.address = ''
  `);
  const noAddressCount = parseInt(noAddress.rows[0].count);
  if (noAddressCount > 0) {
    alerts.push({
      key: "no_address", type: "info", icon: "fas fa-map-location-dot",
      message: { en: "Students missing address", si: "ලිපිනය නැති සිසුන්", ta: "முகவரி இல்லாத மாணவர்கள்" },
      count: noAddressCount,
    });
  }

  return alerts;
};

exports.getClerkAlertDetails = async (alertKey) => {
  let result;
  switch (alertKey) {
    case "no_parent":
      result = await pool.query(`
        SELECT s.id, s.full_name, c.grade, c.name AS class_name
        FROM students s JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE s.parent_id IS NULL ORDER BY c.grade, c.name, s.full_name LIMIT 50
      `);
      break;
    case "no_class":
      result = await pool.query(`
        SELECT u.id, u.username, s.full_name
        FROM users u LEFT JOIN students s ON u.id = s.user_id
        WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student') AND u.class_id IS NULL
        ORDER BY s.full_name LIMIT 50
      `);
      break;
    case "no_teacher":
      result = await pool.query(`
        SELECT c.id, c.grade, c.name FROM classes c
        WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
        ORDER BY c.grade, c.name
      `);
      break;
    case "no_index":
      result = await pool.query(`
        SELECT e.name AS exam_name, s.full_name, u.username
        FROM exam_students es JOIN exams e ON es.exam_id = e.id
        JOIN users u ON es.student_id = u.id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE es.index_number IS NULL OR es.index_number = ''
        ORDER BY e.name, s.full_name LIMIT 50
      `);
      break;
    case "no_birthday":
      result = await pool.query(`
        SELECT s.id, s.full_name, c.grade, c.name AS class_name
        FROM students s JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE s.birthday IS NULL ORDER BY c.grade, c.name, s.full_name LIMIT 50
      `);
      break;
    case "no_timetable":
      result = await pool.query(`
        SELECT c.id, c.grade, c.name FROM classes c
        WHERE c.id NOT IN (
          SELECT DISTINCT ts.class_id FROM timetables t JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
        ) ORDER BY c.grade, c.name
      `);
      break;
    case "no_subjects":
      result = await pool.query(`
        SELECT u.id, td.full_name FROM users u
        LEFT JOIN teacher_details td ON u.id = td.teacher_id
        WHERE u.role_id = (SELECT id FROM roles WHERE name = 'teacher')
        AND u.id NOT IN (SELECT teacher_id FROM teacher_subjects)
        ORDER BY td.full_name
      `);
      break;
    case "no_address":
      result = await pool.query(`
        SELECT s.id, s.full_name, c.grade, c.name AS class_name
        FROM students s JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE s.address IS NULL OR s.address = ''
        ORDER BY c.grade, c.name, s.full_name LIMIT 50
      `);
      break;
    default:
      return null;
  }
  return result ? result.rows : null;
};

function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
}

exports.checkPinStatus = async (userId) => {
  const result = await pool.query("SELECT pin_hash FROM users WHERE id = $1", [userId]);
  return result.rows[0].pin_hash !== null;
};

exports.setPin = async (userId, pin, currentPin = null) => {
  const existing = await pool.query("SELECT pin_hash, pin_salt FROM users WHERE id = $1", [userId]);
  const storedHash = existing.rows[0]?.pin_hash;
  const storedSalt = existing.rows[0]?.pin_salt;

  if (storedHash) {
    if (!currentPin) {
      return { success: false, error: "Current PIN is required to change your PIN." };
    }
    const currentHash = hashPin(currentPin, storedSalt);
    if (currentHash !== storedHash) {
      return { success: false, error: "Current PIN is incorrect." };
    }
  }

  const newSalt = crypto.randomBytes(16).toString("hex");
  const newHash = hashPin(pin, newSalt);

  await pool.query("UPDATE users SET pin_hash = $1, pin_salt = $2 WHERE id = $3", [newHash, newSalt, userId]);
  return { success: true, message: "PIN set successfully" };
};

exports.verifyPin = async (userId, pin) => {
  const result = await pool.query("SELECT pin_hash, pin_salt FROM users WHERE id = $1", [userId]);
  const storedHash = result.rows[0].pin_hash;
  const storedSalt = result.rows[0].pin_salt;

  if (!storedHash) {
    return { success: false, error: "No PIN set. Please set a PIN in your profile." };
  }

  const hash = hashPin(pin, storedSalt);
  return { success: hash === storedHash };
};

exports.getUnmarkedClasses = async () => {
  const today = new Date().toISOString().split("T")[0];
  const result = await pool.query(`
    SELECT c.id, c.grade, c.name
    FROM classes c
    WHERE c.id NOT IN (
      SELECT DISTINCT a.class_id FROM attendance a WHERE a.date = $1
    )
    ORDER BY c.grade, c.name
  `, [today]);

  return {
    count: result.rows.length,
    classes: result.rows.map(r => ({
      id: r.id,
      name: `${r.grade} - ${r.name}`
    }))
  };
};

exports.getAllStudents = async () => {
  const result = await pool.query(`
    SELECT 
      u.id as user_id, u.username, u.class_id,
      s.full_name, s.birthday, s.address, s.gender, s.nationality,
      c.grade, c.name as class_name
    FROM users u
    JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
    ORDER BY c.grade, c.name, s.full_name
  `);
  return result.rows;
};

exports.getAllClasses = async () => {
  const result = await pool.query(`
    SELECT c.id, c.grade, c.name as class_name, ct.teacher_id as class_teacher_id,
      td.full_name as teacher_name
    FROM classes c
    LEFT JOIN class_teachers ct ON c.id = ct.class_id
    LEFT JOIN teacher_details td ON ct.teacher_id = td.teacher_id
    ORDER BY c.grade, c.name
  `);
  return result.rows;
};

exports.getTeachers = async () => {
  const result = await pool.query(`
    SELECT 
      u.id as teacher_id, u.username, u.class_id,
      td.full_name, td.nic, td.address, td.phone_number,
      td.appointment_date, td.level, td.birthday
    FROM users u
    JOIN teacher_details td ON u.id = td.teacher_id
    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'teacher')
    ORDER BY td.full_name
  `);
  return result.rows;
};

exports.getAllTeachers = exports.getTeachers;

exports.getStudentById = async (id) => {
  const result = await pool.query(`
    SELECT 
      u.id, u.username, u.class_id,
      s.full_name, s.birthday, s.address, s.gender, s.nationality, s.parent_id,
      c.grade, c.name as class_name
    FROM users u
    JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON u.class_id = c.id
    WHERE u.id = $1
  `, [id]);
  return result.rows[0] || null;
};

exports.createStudent = async (data) => {
  const { full_name, username, password, birthday, address, gender, nationality, class_id, parent_id } = data;
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = hashPassword(password || username, salt);
  
  const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'student'");
  const roleId = roleResult.rows[0].id;
  
  const userResult = await pool.query(
    `INSERT INTO users (username, password, salt, role_id, class_id) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [username, hashedPassword, salt, roleId, class_id]
  );
  const userId = userResult.rows[0].id;
  
  await pool.query(
    `INSERT INTO students (user_id, full_name, birthday, address, gender, nationality, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, full_name, birthday, address, gender, nationality, parent_id]
  );
  
  return { id: userId, username };
};

exports.updateStudent = async (id, data) => {
  const { full_name, birthday, address, gender, nationality, class_id, parent_id } = data;
  
  await pool.query(
    `UPDATE users SET class_id = $1 WHERE id = $2`,
    [class_id, id]
  );
  
  const result = await pool.query(
    `UPDATE students SET full_name = $1, birthday = $2, address = $3, gender = $4, nationality = $5, parent_id = $6
     WHERE user_id = $7 RETURNING *`,
    [full_name, birthday, address, gender, nationality, parent_id, id]
  );
  
  return result.rows[0];
};

exports.deleteStudent = async (id) => {
  await pool.query("DELETE FROM students WHERE user_id = $1", [id]);
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return true;
};
