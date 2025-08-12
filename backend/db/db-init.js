require("dotenv").config();
const pool = require("./index");

async function initializeDatabase() {
  try {
    console.log(
      `Connected to database: ${process.env.DB_NAME || "(from URL)"}`
    );

    // Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'clerk')),
        salt VARCHAR(255)
      );
    `);

    // Teachers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Classes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        grade VARCHAR(10) NOT NULL,
        class_teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL
      );
    `);

    // Students (with index_number)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        index_number VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        age INT CHECK (age > 0),
        class_id INT REFERENCES classes(id) ON DELETE SET NULL
      );
    `);

    // Subjects
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL
      );
    `);

    // Teacher_Class_Subject
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_class_subject (
        id SERIAL PRIMARY KEY,
        teacher_id INT REFERENCES teachers(id) ON DELETE CASCADE,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE (teacher_id, class_id, subject_id)
      );
    `);

    // Timetables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id SERIAL PRIMARY KEY,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
        period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 8),
        teacher_class_subject_id INT REFERENCES teacher_class_subject(id) ON DELETE CASCADE,
        UNIQUE(day_of_week, period_number, teacher_class_subject_id)
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
