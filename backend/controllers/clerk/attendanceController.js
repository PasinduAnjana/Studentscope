const adminService = require("../../services/adminService");
const pool = require("../../db");

exports.getAttendanceStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const stats = await adminService.getAttendanceStats(today);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(stats));
    } catch (error) {
        console.error("Error fetching attendance stats:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch attendance stats" }));
    }
};

exports.getUnmarkedClasses = async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const result = await pool.query(`
            SELECT c.id, c.grade, c.name
            FROM classes c
            WHERE c.id NOT IN (
                SELECT DISTINCT a.class_id FROM attendance a WHERE a.date = $1
            )
            ORDER BY c.grade, c.name
        `, [today]);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            count: result.rows.length,
            classes: result.rows.map(r => ({
                id: r.id,
                name: `${r.grade} - ${r.name}`
            }))
        }));
    } catch (error) {
        console.error("Error fetching unmarked classes:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch unmarked classes" }));
    }
};
