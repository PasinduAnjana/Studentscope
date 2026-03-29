const crypto = require("crypto");
const pool = require("../../db");

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = "sha512";

function hashPin(pin, salt) {
    return crypto.pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
}

function verifyPinHash(pin, storedHash, storedSalt) {
    const hash = hashPin(pin, storedSalt);
    return hash === storedHash;
}

exports.checkPinStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query("SELECT pin_hash FROM users WHERE id = $1", [userId]);
        const hasPin = result.rows[0].pin_hash !== null;

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

            // Check if a PIN already exists — if so, require current PIN verification
            const existing = await pool.query("SELECT pin_hash, pin_salt FROM users WHERE id = $1", [userId]);
            const storedHash = existing.rows[0]?.pin_hash;
            const storedSalt = existing.rows[0]?.pin_salt;

            if (storedHash) {
                if (!currentPin) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Current PIN is required to change your PIN." }));
                }
                if (!verifyPinHash(currentPin, storedHash, storedSalt)) {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Current PIN is incorrect." }));
                }
            }

            // Hash the new PIN with a fresh salt
            const newSalt = crypto.randomBytes(16).toString("hex");
            const newHash = hashPin(pin, newSalt);

            await pool.query("UPDATE users SET pin_hash = $1, pin_salt = $2 WHERE id = $3", [newHash, newSalt, userId]);

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

            const result = await pool.query("SELECT pin_hash, pin_salt FROM users WHERE id = $1", [userId]);
            const storedHash = result.rows[0].pin_hash;
            const storedSalt = result.rows[0].pin_salt;

            if (!storedHash) {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(JSON.stringify({ error: "No PIN set. Please set a PIN in your profile." }));
            }

            if (verifyPinHash(pin, storedHash, storedSalt)) {
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
