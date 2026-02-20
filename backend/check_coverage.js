const path = require('path');
const dotenv = require('dotenv');

// Try loading from current dir
let result = dotenv.config();
if (result.error) {
    // Try loading from parent dir
    result = dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

if (result.parsed) {
    console.log("Loaded .env settings");
} else {
    console.log("Could not find .env file, checking environment variables directly");
}
const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkCoverage() {
    try {
        // Check if any Elective subjects are assigned to teachers
        const electiveAssignments = await pool.query(`
      SELECT COUNT(*) 
      FROM teacher_subjects ts
      JOIN grade_subjects gs ON ts.subject_id = gs.subject_id
      WHERE gs.type = 'elective'
    `);
        console.log("Elective Assignments Count:", electiveAssignments.rows[0].count);

        // Check if any Elective subjects are in timetables
        const electiveTimetables = await pool.query(`
      SELECT COUNT(*) 
      FROM timetables t
      JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
      JOIN grade_subjects gs ON ts.subject_id = gs.subject_id
      WHERE gs.type = 'elective'
    `);
        console.log("Elective Timetable Slots Count:", electiveTimetables.rows[0].count);

        // List some subjects that ARE assigned
        const sample = await pool.query(`
        SELECT s.name, c.grade 
        FROM teacher_subjects ts
        JOIN subjects s ON ts.subject_id = s.id
        JOIN classes c ON ts.class_id = c.id
        LIMIT 5
    `);
        console.log("Sample Assigned Subjects:", sample.rows.map(r => `${r.name} (${r.grade})`));

    } catch (err) {
        console.error(err);
    } finally {
        // Verify Max 4 Subjects Constraint
        const constraintRes = await pool.query(`
        SELECT teacher_id, COUNT(DISTINCT subject_id) as subject_count
        FROM teacher_subjects
        GROUP BY teacher_id
        HAVING COUNT(DISTINCT subject_id) > 4
    `);

        if (constraintRes.rows.length > 0) {
            console.error("❌ CONSTRAINT VIOLATION: The following teachers have > 4 subjects:");
            console.table(constraintRes.rows);
            process.exit(1);
        } else {
            console.log("✅ VERIFIED: All teachers have <= 4 distinct subjects.");
        }

        await pool.end();
        console.log("Exit code: 0");
    }
}

checkCoverage();
