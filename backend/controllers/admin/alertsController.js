const adminService = require("../../services/adminService");

exports.getAlerts = async (req, res) => {
    try {
        const alerts = await adminService.getAlerts();

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

        const result = await adminService.getAlertDetails(alertKey);

        if (!result) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "Unknown alert type" }));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
    } catch (error) {
        console.error("Error fetching alert details:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch alert details" }));
    }
};
