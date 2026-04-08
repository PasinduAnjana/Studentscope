const clerkService = require("../../services/clerkService");

exports.checkPinStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const hasPin = await clerkService.checkPinStatus(userId);

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
            const { pin, currentPin } = JSON.parse(body);
            if (!pin || pin.length !== 4 || isNaN(pin)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "Invalid PIN format. Must be 4 digits." }));
            }

            const userId = req.user.userId;
            const result = await clerkService.setPin(userId, pin, currentPin);

            if (!result.success) {
                const status = result.error.includes("incorrect") ? 401 : 400;
                res.writeHead(status, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: result.error }));
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: result.message }));
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

            const result = await clerkService.verifyPin(userId, pin);

            if (!result.success) {
                if (result.error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: result.error }));
                }
                res.writeHead(401, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ success: false, error: "Incorrect PIN" }));
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
        });
    } catch (error) {
        console.error("Error verifying PIN:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to verify PIN" }));
    }
};