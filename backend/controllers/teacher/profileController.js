const teacherService = require("../../services/teacherService");
const fs = require("fs");
const path = require("path");

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const details = await teacherService.getTeacherDetails(userId);

    const profile = {
      id: userId,
      username: req.user.username,
      role: req.user.role,
      class_id: req.user.class_id,
      class_name: req.user.class_name,
      class_grade: req.user.class_grade,
      is_class_teacher: req.user.is_class_teacher,
      details: details,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(profile));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch profile" }));
  }
};

exports.getTeacherClasses = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const classes = await teacherService.getTeacherClasses(userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch teacher classes" }));
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { oldPassword, newPassword } = JSON.parse(body);

        if (!oldPassword || !newPassword) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Old password and new password are required",
            })
          );
          return;
        }

        const result = await teacherService.changePassword(
          userId,
          oldPassword,
          newPassword
        );

        if (!result.success) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: result.message }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Password changed successfully" }));
      } catch (err) {
        console.error("Error parsing request:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid request body" }));
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to change password" }));
  }
};

exports.getPendingPasswordResets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resets = await teacherService.getPendingPasswordResets();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resets));
  } catch (err) {
    console.error("Error fetching password resets:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch password resets" }));
  }
};

exports.approvePasswordReset = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await teacherService.approvePasswordReset(resetId, userId);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Password reset approved" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: result.error }));
    }
  } catch (err) {
    console.error("Error approving password reset:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to approve password reset" }));
  }
};

exports.rejectPasswordReset = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resetId = parseInt(req.url.split("/")[4]);
    const result = await teacherService.rejectPasswordReset(resetId, userId);

    if (result.success) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Password reset rejected" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: result.error }));
    }
  } catch (err) {
    console.error("Error rejecting password reset:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to reject password reset" }));
  }
};

exports.uploadFile = async (req, res) => {
  try {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const { fileData } = JSON.parse(body);
        if (!fileData) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "No file data" }));
        }
        
        const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid base64 data" }));
        }

        const buffer = Buffer.from(matches[2], "base64");
        let ext = "";
        if (matches[1].includes("image/")) {
          ext = matches[1].split("/")[1];
          if (ext === 'jpeg') ext = 'jpg';
        }
        const finalName = ext ? `upload_${Date.now()}.${ext}` : `upload_${Date.now()}.bin`;

        const uploadDir = path.join(__dirname, "../../../frontend/assets/uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, finalName), buffer);
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ url: `/assets/uploads/${finalName}` }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to parse or save" }));
      }
    });
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server error" }));
  }
};
