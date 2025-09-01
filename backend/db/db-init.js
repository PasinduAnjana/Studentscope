require("dotenv").config();
const pool = require("./index");

async function initializeDatabase() {
  try {
    console.log(
      `Connected to database: ${process.env.DB_NAME || "(from URL)"}`
    );

    // Classes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL UNIQUE,
        grade INTEGER NOT NULL
      );
    `);

    // Roles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    // Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        role_id BIGINT REFERENCES roles(id),
        class_id BIGINT REFERENCES classes(id),
        is_class_teacher BOOLEAN DEFAULT FALSE
      );
    `);

    // Subjects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    // Exams
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        year INTEGER NOT NULL
      );
    `);

    // Timetables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        class_id BIGINT REFERENCES classes(id),
        subject_id BIGINT REFERENCES subjects(id),
        teacher_id BIGINT REFERENCES users(id),
        day_of_week INTEGER NOT NULL,
        slot INTEGER NOT NULL
      );
    `);

    // Marks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marks (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id),
        marks INTEGER NOT NULL,
        exam_id BIGINT REFERENCES exams(id)
      );
    `);

    // Attendance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        class_id BIGINT REFERENCES classes(id),
        date DATE NOT NULL,
        status BOOLEAN NOT NULL
      );
    `);

    // Class Teachers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_teachers (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id),
        class_id BIGINT REFERENCES classes(id)
      );
    `);

    // Teacher Subjects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        teacher_id BIGINT REFERENCES users(id),
        subject_id BIGINT REFERENCES subjects(id),
        class_id BIGINT REFERENCES classes(id)
      );
    `);

    // Notices
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

    // Achievements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        student_id BIGINT REFERENCES users(id),
        description TEXT NOT NULL,
        achieved_at DATE NOT NULL
      );
    `);

    // Sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    console.log("✅ All tables created successfully");
  } catch (err) {
    console.error("❌ Error creating tables:", err);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
