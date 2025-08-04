require("dotenv").config();
const { Client } = require("pg");

const adminConfig = {
  user: process.env.DB_ADMIN_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  password: process.env.DB_ADMIN_PASSWORD || "",
  port: process.env.DB_PORT || 5432,
};

const appConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "studentscope",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 5432,
};

async function initializeDatabase() {
  const adminClient = new Client(adminConfig);
  try {
    await adminClient.connect();
    console.log("Connected as admin to PostgreSQL server");

    const dbName = appConfig.database;
    const res = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await adminClient.end();
  }

  const appClient = new Client(appConfig);
  try {
    await appClient.connect();
    console.log(`Connected to database "${appConfig.database}"`);

    // Create users table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student','clerk')),
        salt VARCHAR(255)
      );
    `);

    // Create students table (fixed syntax)
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        age INT CHECK (age > 0),
        grade VARCHAR(10)
      );
    `);

    console.log("Tables created/verified successfully");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    await appClient.end();
  }
}

initializeDatabase();
