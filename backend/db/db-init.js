// db-init.js
require("dotenv").config();
const pool = require("./index"); // ✅ uses shared DB connection

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

    // Students
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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

    // Timetables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id SERIAL PRIMARY KEY,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
        period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 8),
        subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
        teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
        class_id INT REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(day_of_week, period_number, class_id)
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
