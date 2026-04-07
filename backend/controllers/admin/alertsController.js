const pool = require("../../db");

exports.getAlerts = async (req, res) => {
    try {
        const alerts = [];

        // 1. Classes without a teacher assigned
        const noTeacher = await pool.query(`
            SELECT COUNT(*) as count
            FROM classes c
            WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
        `);
        const noTeacherCount = parseInt(noTeacher.rows[0].count);
        if (noTeacherCount > 0) {
            alerts.push({
                key: "no_teacher",
                type: "danger",
                icon: "fas fa-chalkboard-user",
                message: { en: "Classes without a teacher", si: "ගුරුවරයෙකු නැති පන්ති", ta: "ஆசிரியர் இல்லாத வகுப்புகள்" },
                count: noTeacherCount,
            });
        }

        // 2. Students not assigned to a class
        const noClass = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
              AND (u.class_id IS NULL)
        `);
        const noClassCount = parseInt(noClass.rows[0].count);
        if (noClassCount > 0) {
            alerts.push({
                key: "no_class",
                type: "danger",
                icon: "fas fa-user-xmark",
                message: { en: "Students not assigned to a class", si: "පන්තියකට පවරා නැති සිසුන්", ta: "வகுப்பு ஒதுக்கப்படாத மாணவர்கள்" },
                count: noClassCount,
            });
        }

        // 3. Students without a parent/guardian
        const noParent = await pool.query(`
            SELECT COUNT(*) as count
            FROM students s
            WHERE s.parent_id IS NULL
        `);
        const noParentCount = parseInt(noParent.rows[0].count);
        if (noParentCount > 0) {
            alerts.push({
                key: "no_parent",
                type: "warning",
                icon: "fas fa-user-slash",
                message: { en: "Students without guardian info", si: "භාරකරු තොරතුරු නැති සිසුන්", ta: "பாதுகாவலர் தகவல் இல்லாத மாணவர்கள்" },
                count: noParentCount,
            });
        }

        // 4. Classes without timetables
        const noTimetable = await pool.query(`
            SELECT COUNT(*) as count
            FROM classes c
            WHERE c.id NOT IN (
                SELECT DISTINCT ts.class_id
                FROM timetables t
                JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
            )
        `);
        const noTimetableCount = parseInt(noTimetable.rows[0].count);
        if (noTimetableCount > 0) {
            alerts.push({
                key: "no_timetable",
                type: "warning",
                icon: "fas fa-calendar-times",
                message: { en: "Classes without a timetable", si: "කාලසටහනක් නැති පන්ති", ta: "நேர அட்டவணை இல்லாத வகுப்புகள்" },
                count: noTimetableCount,
            });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(alerts));
    } catch (error) {
        console.error("Error fetching admin alerts:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch alerts" }));
    }
};

exports.getAlertDetails = async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const alertKey = url.searchParams.get("type");

        let result;
        switch (alertKey) {
            case "no_teacher":
                result = await pool.query(`
                    SELECT c.id, c.grade, c.name
                    FROM classes c
                    WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
                    ORDER BY c.grade, c.name
                `);
                break;
            case "no_class":
                result = await pool.query(`
                    SELECT u.id, u.username, s.full_name
                    FROM users u
                    LEFT JOIN students s ON u.id = s.user_id
                    WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
                      AND u.class_id IS NULL
                    ORDER BY s.full_name
                    LIMIT 50
                `);
                break;
            case "no_parent":
                result = await pool.query(`
                    SELECT s.id, s.full_name, c.grade, c.name AS class_name
                    FROM students s
                    JOIN users u ON s.user_id = u.id
                    LEFT JOIN classes c ON u.class_id = c.id
                    WHERE s.parent_id IS NULL
                    ORDER BY c.grade, c.name, s.full_name
                    LIMIT 50
                `);
                break;
            case "no_timetable":
                result = await pool.query(`
                    SELECT c.id, c.grade, c.name
                    FROM classes c
                    WHERE c.id NOT IN (
                        SELECT DISTINCT ts.class_id
                        FROM timetables t
                        JOIN teacher_subjects ts ON t.teacher_subject_id = ts.id
                    )
                    ORDER BY c.grade, c.name
                `);
                break;
            default:
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "Unknown alert type" }));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result.rows));
    } catch (error) {
        console.error("Error fetching alert details:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch alert details" }));
    }
};
