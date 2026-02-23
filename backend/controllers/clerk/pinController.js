const pool = require("../../db");

exports.checkPinStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query("SELECT pin FROM users WHERE id = $1", [userId]);
        const hasPin = result.rows[0].pin !== null;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ hasPin }));
    } catch (error) {
        console.error("Error checking PIN status:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to check PIN status" }));
    }
};

exports.setPin = async (req, res) => {
    try {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", async () => {
            const { pin } = JSON.parse(body);
            if (!pin || pin.length !== 4 || isNaN(pin)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "Invalid PIN format. Must be 4 digits." }));
            }

            const userId = req.user.userId;
            await pool.query("UPDATE users SET pin = $1 WHERE id = $2", [pin, userId]);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "PIN set successfully" }));
        });
    } catch (error) {
        console.error("Error setting PIN:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to set PIN" }));
    }
};

exports.verifyPin = async (req, res) => {
    try {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", async () => {
            const { pin } = JSON.parse(body);
            const userId = req.user.userId;

            const result = await pool.query("SELECT pin FROM users WHERE id = $1", [userId]);
            const storedPin = result.rows[0].pin;

            if (!storedPin) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "No PIN set. Please set a PIN in your profile." }));
            }

            if (storedPin === pin) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: "Incorrect PIN" }));
            }
        });
    } catch (error) {
        console.error("Error verifying PIN:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to verify PIN" }));
    }
};
