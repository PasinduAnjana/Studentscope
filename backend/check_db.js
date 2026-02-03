require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM grade_subjects WHERE grade = 10 AND type = 'elective'");
        console.log("Grade 10 Electives Count:", res.rows.length);
        console.log("Sample:", res.rows.slice(0, 3));

        const studentsRes = await pool.query("SELECT * FROM student_subjects LIMIT 5");
        console.log("Student Subjects Sample:", studentsRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
