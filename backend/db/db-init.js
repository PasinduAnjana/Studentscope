require("dotenv").config();
const pool = require("./index");

async function initializeDatabase() {
  try {
    console.log(
      `Connected to database: ${process.env.DB_NAME || "(from URL)"}`
    );

    // ⚠ Drop all tables first
    await pool.query(`
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
`);

    console.log("✅ All existing tables dropped");

    // --- Tables ---
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        grade INTEGER NOT NULL,
        UNIQUE (grade, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        username TEXT NOT NULL UNIQUE, -- index number for students
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        role_id BIGINT REFERENCES roles(id),
        class_id BIGINT REFERENCES classes(id),
        is_class_teacher BOOLEAN DEFAULT FALSE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        address TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id BIGINT REFERENCES users(id) UNIQUE,
        full_name TEXT NOT NULL,
        birthday DATE,
        address TEXT,
        gender TEXT,
        nationality TEXT,
        parent_id BIGINT REFERENCES parents(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        class_id BIGINT REFERENCES classes(id),
        subject_id BIGINT REFERENCES subjects(id),
        is_common BOOLEAN DEFAULT true,
        is_mandatory BOOLEAN DEFAULT true,
        display_order INT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grade_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        grade INT NOT NULL,
        subject_id BIGINT REFERENCES subjects(id),
        type TEXT NOT NULL CHECK (type IN ('compulsory','elective')),
        bucket_id INT DEFAULT 0, -- 0 for no bucket, 1/2/3 for baskets
        display_order INT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grade_subject_rules (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        grade INT NOT NULL,
        elective_count INT NOT NULL DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('term', 'gov')),
        sub_type TEXT, -- 'OL', 'AL', 'Grade5', 'Term1', 'Term2', 'Term3'
        year INTEGER NOT NULL,
        target_grade INTEGER -- For gov exams (5, 11, 13)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS exam_students (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        exam_id BIGINT REFERENCES exams(id) ON DELETE CASCADE,
        student_id BIGINT REFERENCES users(id),
        index_number TEXT,
        UNIQUE(exam_id, student_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id),
        class_id BIGINT REFERENCES classes(id),
        UNIQUE(teacher_id, subject_id, class_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_subject_id BIGINT REFERENCES teacher_subjects(id),
        day_of_week INTEGER NOT NULL,
        slot INTEGER NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS marks (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id),
        marks TEXT, -- Changed to TEXT to support 'A', 'B', etc.
        exam_id BIGINT REFERENCES exams(id),
        UNIQUE(student_id, subject_id, exam_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        class_id BIGINT REFERENCES classes(id),
        date DATE NOT NULL,
        status BOOLEAN NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_teachers (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id),
        class_id BIGINT REFERENCES classes(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id),
        class_id BIGINT REFERENCES classes(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        posted_by BIGINT REFERENCES users(id),
        audience TEXT NOT NULL,
        posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        posted_by BIGINT REFERENCES users(id),
        audience_type TEXT NOT NULL CHECK (audience_type IN ('teachers', 'students', 'all', 'clerks', 'all-teachers')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcement_classes (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        announcement_id BIGINT REFERENCES announcements(id) ON DELETE CASCADE,
        class_id BIGINT REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(announcement_id, class_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcement_teachers (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        announcement_id BIGINT REFERENCES announcements(id) ON DELETE CASCADE,
        teacher_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(announcement_id, teacher_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcement_clerks (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        announcement_id BIGINT REFERENCES announcements(id) ON DELETE CASCADE,
        clerk_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(announcement_id, clerk_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('academic', 'sports', 'arts', 'other')),
        achieved_at DATE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS behavior_records (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        class_id BIGINT REFERENCES classes(id),
        type TEXT NOT NULL CHECK (type IN ('Good', 'Disciplinary', 'Reward')),
        severity TEXT CHECK (severity IN ('Minor', 'Serious', null)),
        description TEXT NOT NULL,
        reported_by BIGINT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_details (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id) UNIQUE,
        full_name TEXT NOT NULL,
        nic TEXT,
        address TEXT,
        phone_number TEXT,
        past_schools TEXT,
        appointment_date DATE,
        first_appointment_date DATE,
        level INTEGER CHECK (level IN (1, 2, 3)),
        birthday DATE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clerk_details (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        clerk_id BIGINT REFERENCES users(id) UNIQUE,
        full_name TEXT NOT NULL,
        nic TEXT,
        address TEXT,
        phone_number TEXT,
        past_schools TEXT,
        appointment_date DATE,
        first_appointment_date DATE,
        birthday DATE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    console.log("✅ Tables created successfully");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        reset_token TEXT UNIQUE NOT NULL,
        new_password TEXT,
        new_salt TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT now(),
        approved_by BIGINT REFERENCES users(id),
        approved_at TIMESTAMPTZ
      );
    `);
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
