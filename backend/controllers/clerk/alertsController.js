const pool = require("../../db");

exports.getAlerts = async (req, res) => {
    try {
        const alerts = [];

        // 1. Students without a parent/guardian
        const noParent = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.parent_id IS NULL
    `);
        const noParentCount = parseInt(noParent.rows[0].count);
        if (noParentCount > 0) {
            alerts.push({
                type: "warning",
                icon: "fas fa-user-slash",
                message: { en: "Students without guardian info", si: "භාරකරු තොරතුරු නැති සිසුන්", ta: "பாதுகாவலர் தகவல் இல்லாத மாணவர்கள்" },
                count: noParentCount,
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
                type: "warning",
                icon: "fas fa-user-xmark",
                message: { en: "Students not assigned to a class", si: "පන්තියකට පවරා නැති සිසුන්", ta: "வகுப்பு ஒதுக்கப்படாத மாணவர்கள்" },
                count: noClassCount,
            });
        }

        // 3. Classes without a teacher assigned
        const noTeacher = await pool.query(`
      SELECT COUNT(*) as count
      FROM classes c
      WHERE c.id NOT IN (SELECT class_id FROM class_teachers)
    `);
        const noTeacherCount = parseInt(noTeacher.rows[0].count);
        if (noTeacherCount > 0) {
            alerts.push({
                type: "info",
                icon: "fas fa-chalkboard",
                message: { en: "Classes without a teacher", si: "ගුරුවරයෙකු නැති පන්ති", ta: "ஆசிரியர் இல்லாத வகுப்புகள்" },
                count: noTeacherCount,
            });
        }

        // 4. Exam students without index numbers
        const noIndex = await pool.query(`
      SELECT COUNT(*) as count
      FROM exam_students es
      JOIN exams e ON es.exam_id = e.id
      WHERE (es.index_number IS NULL OR es.index_number = '')
    `);
        const noIndexCount = parseInt(noIndex.rows[0].count);
        if (noIndexCount > 0) {
            alerts.push({
                type: "danger",
                icon: "fas fa-hashtag",
                message: { en: "Exam entries missing index numbers", si: "සුචිගත අංක නැති විභාග ඇතුළත් කිරීම්", ta: "குறியீட்டு எண் இல்லாத தேர்வு பதிவுகள்" },
                count: noIndexCount,
            });
        }

        // 5. Students missing birthday info
        const noBirthday = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.birthday IS NULL
    `);
        const noBirthdayCount = parseInt(noBirthday.rows[0].count);
        if (noBirthdayCount > 0) {
            alerts.push({
                type: "info",
                icon: "fas fa-cake-candles",
                message: { en: "Students missing birthday", si: "උපන්දිනය නැති සිසුන්", ta: "பிறந்த நாள் இல்லாத மாணவர்கள்" },
                count: noBirthdayCount,
            });
        }

        // 6. Classes without timetables
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
                type: "warning",
                icon: "fas fa-calendar-times",
                message: { en: "Classes without a timetable", si: "කාලසටහනක් නැති පන්ති", ta: "நேர அட்டவணை இல்லாத வகுப்புகள்" },
                count: noTimetableCount,
            });
        }

        // 7. Teachers without assigned subjects
        const noSubjects = await pool.query(`
      SELECT COUNT(*) as count
      FROM users u
      WHERE u.role_id = (SELECT id FROM roles WHERE name = 'teacher')
        AND u.id NOT IN (SELECT teacher_id FROM teacher_subjects)
    `);
        const noSubjectsCount = parseInt(noSubjects.rows[0].count);
        if (noSubjectsCount > 0) {
            alerts.push({
                type: "info",
                icon: "fas fa-book-open",
                message: { en: "Teachers without assigned subjects", si: "විෂයයන් පවරා නැති ගුරුවරුන්", ta: "பாடம் ஒதுக்கப்படாத ஆசிரியர்கள்" },
                count: noSubjectsCount,
            });
        }

        // 8. Students missing address info
        const noAddress = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      WHERE s.address IS NULL OR s.address = ''
    `);
        const noAddressCount = parseInt(noAddress.rows[0].count);
        if (noAddressCount > 0) {
            alerts.push({
                type: "info",
                icon: "fas fa-map-location-dot",
                message: { en: "Students missing address", si: "ලිපිනය නැති සිසුන්", ta: "முகவரி இல்லாத மாணவர்கள்" },
                count: noAddressCount,
            });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(alerts));
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch alerts" }));
    }
};
