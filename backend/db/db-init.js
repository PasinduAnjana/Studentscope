require("dotenv").config();
const { Client } = require("pg");

const adminConfig = {
  user: process.env.DB_ADMIN_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  password: process.env.DB_ADMIN_PASSWORD || 123,
  port: process.env.DB_PORT || 5432,
};

const appConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "studentscope",
  password: process.env.DB_PASSWORD || 123,
  port: process.env.DB_PORT || 5432,
};

async function initializeDatabase() {
  const adminClient = new Client(adminConfig);
  try {
    await adminClient.connect();
    console.log("Connected as admin to PostgreSQL server");

    const dbName = appConfig.database;

    // 🔹 Drop existing DB if exists
    await adminClient.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    );
    await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
    console.log(`Database "${dbName}" dropped successfully`);

    // 🔹 Create new DB
    await adminClient.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database "${dbName}" created successfully`);
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await adminClient.end();
  }

  const appClient = new Client(appConfig);
  try {
    await appClient.connect();
    console.log(`Connected to database "${appConfig.database}"`);

    // Users
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'clerk')),
        salt VARCHAR(255)
      );
    `);

    // Teachers
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Classes
    // Classes table (linked to class teacher)
    await appClient.query(`
  CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    grade VARCHAR(10) NOT NULL,
    class_teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL
  );
`);

    // Students
    // Students table (db-init.js)
    await appClient.query(`
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
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL
      );
    `);

    // Timetables (🔹 now using numeric weekday)
    await appClient.query(`
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
    console.error("Error creating tables:", err);
  } finally {
    await appClient.end();
  }
}

initializeDatabase();
