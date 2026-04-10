const adminService = require("../../services/adminService");
const clerkService = require("../../services/clerkService");

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
        const result = await clerkService.getUnmarkedClasses();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
    } catch (error) {
        console.error("Error fetching unmarked classes:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch unmarked classes" }));
    }
};