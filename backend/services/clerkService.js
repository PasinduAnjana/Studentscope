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
async function getClerkDetails(userId) {
  const result = await pool.query(
    `SELECT full_name, nic, address, phone_number, past_schools, appointment_date, first_appointment_date, birthday
     FROM clerk_details WHERE clerk_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
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
      u.id AS teacher_id,
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
  // Find current teacher for this class
  const current = await pool.query(
    "SELECT teacher_id FROM class_teachers WHERE class_id = $1",
    [classId]
  );
  if (current.rows.length > 0) {
    const oldTeacherId = current.rows[0].teacher_id;
    // Set old teacher's class_id to null and is_class_teacher to false
    await pool.query(
      "UPDATE users SET class_id = NULL, is_class_teacher = FALSE WHERE id = $1",
      [oldTeacherId]
    );
  }

  // Remove existing assignment
  await pool.query("DELETE FROM class_teachers WHERE class_id = $1", [classId]);

  // If teacherId is provided, assign the new teacher
  if (teacherId) {
    await pool.query(
      "INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2)",
      [classId, teacherId]
    );
    // Set new teacher's class_id and is_class_teacher to true
    await pool.query(
      "UPDATE users SET class_id = $1, is_class_teacher = TRUE WHERE id = $2",
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

async function assignTeacherToClass(grade, className, teacherId) {
  // Find the class by grade and name
  let classResult = await pool.query(
    "SELECT id FROM classes WHERE grade = $1 AND name = $2",
    [grade, className]
  );

  let classId;
  if (classResult.rows.length === 0) {
    // Class doesn't exist, create it
    classId = await createClass(grade, className);
  } else {
    classId = classResult.rows[0].id;
  }

  await assignClassTeacher(classId, teacherId);
  return classId;
}

async function deleteClass(classId) {
  // Check if class exists
  const classResult = await pool.query("SELECT id FROM classes WHERE id = $1", [
    classId,
  ]);
  if (classResult.rows.length === 0) {
    throw new Error("Class not found");
  }

  // Check if there are students in the class
  const studentCount = await pool.query(
    "SELECT COUNT(*) FROM users WHERE class_id = $1",
    [classId]
  );
  if (parseInt(studentCount.rows[0].count) > 0) {
    throw new Error("Cannot delete class with students assigned");
  }

  // Delete class teacher assignments first
  await pool.query("DELETE FROM class_teachers WHERE class_id = $1", [classId]);

  // Delete the class
  await pool.query("DELETE FROM classes WHERE id = $1", [classId]);

  return true;
}

async function getAllTeachers() {
  const result = await pool.query(`
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
    ORDER BY td.full_name
  `);
  return result.rows;
}

async function getTeacherById(teacherId) {
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

async function createTeacher({
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

async function updateTeacher(
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

async function deleteTeacher(teacherId) {
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

  // Delete from notices
  await pool.query("DELETE FROM notices WHERE posted_by = $1", [teacherId]);

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
const getTimetableForClass = async (classId) => {
  const result = await pool.query(
    `
    SELECT 
      t.day_of_week,
      t.slot AS period_number,
      s.name AS subject,
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
    subject: row.subject,
    teacher_name: row.teacher_name,
  }));
};

// Assign timetable slot
const assignTimetableSlot = async (
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

// Get all subjects
const getSubjects = async () => {
  const result = await pool.query(
    "SELECT id AS subject_id, name AS subject_name FROM subjects ORDER BY name"
  );
  return result.rows;
};

// Announcement functions
const getAllAnnouncements = async (clerkId) => {
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

const createAnnouncement = async ({
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

const updateAnnouncement = async (
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

const deleteAnnouncement = async (announcementId, clerkId) => {
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

const getAnnouncementWithDetails = async (announcementId) => {
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
const getStaffAnnouncements = async () => {
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
const getAnnouncementsForClerk = async (clerkId) => {
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

async function assignTeacherToClass(grade, className, teacherId) {
  // Find the class by grade and name
  let classResult = await pool.query(
    "SELECT id FROM classes WHERE grade = $1 AND name = $2",
    [grade, className]
  );

  let classId;
  if (classResult.rows.length === 0) {
    // Class doesn't exist, create it
    classId = await createClass(grade, className);
  } else {
    classId = classResult.rows[0].id;
  }

  await assignClassTeacher(classId, teacherId);
  return classId;
}

async function deleteClass(classId) {
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

module.exports = {
  getClerkDetails,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getAllClasses,
  getTeachers,
  assignClassTeacher,
  assignTeacherToClass,
  deleteClass,
  createClass,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTimetableForClass,
  assignTimetableSlot,
  getSubjects,
  // Announcement functions
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementWithDetails,
  getStaffAnnouncements,
  getAnnouncementsForClerk,
  // Password reset functions
  getPendingPasswordResets,
  approvePasswordReset,
  rejectPasswordReset,
};

// Password reset functions
async function getPendingPasswordResets() {
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

async function approvePasswordReset(resetId, approverId) {
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

async function rejectPasswordReset(resetId, rejectedBy) {
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
