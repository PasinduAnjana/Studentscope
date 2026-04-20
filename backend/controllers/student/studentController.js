const studentService = require("../../services/studentService");

exports.getTodaysTimetable = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const timetable = await studentService.getTodaysTimetable(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timetable));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch timetable" }));
  }
};

exports.getWeeklyTimetable = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const timetable = await studentService.getWeeklyTimetable(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(timetable));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch weekly timetable" }));
  }
};

exports.getAttendancePercentage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const attendanceData = await studentService.getAttendancePercentage(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(attendanceData));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch attendance percentage" }));
  }
};

exports.getPresentDays = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const presentDays = await studentService.getPresentDays(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ presentDays }));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch present days" }));
  }
};

exports.getAverageMarks = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const examId = url.searchParams.get("examId");

    const marksData = await studentService.getAverageMarks(userId, examId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(marksData));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch average marks" }));
  }
};

exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const achievements = await studentService.getAchievements(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(achievements));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch achievements" }));
  }
};

exports.getEvents = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No user id found" }));
      return;
    }

    const events = await studentService.getEventsForStudent(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(events));
  } catch (err) {
    console.error("Error in getEvents:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const announcements = await studentService.getAnnouncementsForStudent(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch announcements" }));
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const profile = await studentService.getProfile(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(profile));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch profile" }));
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

        const result = await studentService.changePassword(
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

exports.getClassRank = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const examId = url.searchParams.get("examId");

    const rankData = await studentService.getClassRank(userId, examId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rankData));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch class rank" }));
  }
};

exports.getTermTests = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const termTests = await studentService.getTermTests();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(termTests));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch term tests" }));
  }
};

exports.getTermTestMarks = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const examId = url.searchParams.get("examId");

    if (!examId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "examId is required" }));
      return;
    }

    const marks = await studentService.getTermTestMarks(userId, examId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(marks));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch term test marks" }));
  }
};

exports.getTermTestTrend = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const trend = await studentService.getTermTestTrend(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(trend));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch term test trend" }));
  }
};

exports.getCertificates = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const certificates = await studentService.getCertificates(userId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(certificates));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch certificates" }));
  }
};

exports.createCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        if (!data.type || !data.reason) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "type and reason are required" }));
          return;
        }

        const certificate = await studentService.createCertificate(userId, data);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(certificate));
      } catch (parseErr) {
        console.error("Parse error:", parseErr);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request body" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to create certificate" }));
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const certId = url.searchParams.get("id") || req.url.split("/").pop();

    if (!certId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Certificate ID is required" }));
      return;
    }

    await studentService.deleteCertificate(userId, parseInt(certId));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Certificate deleted" }));
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to delete certificate" }));
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const certId = req.url.split("/").pop();
    if (!certId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Certificate ID is required" }));
      return;
    }

    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", async () => {
      const data = JSON.parse(body);
      const { type, reason, selectedAchievements } = data;

      if (!type || !reason) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Type and reason are required" }));
      }

      try {
        const result = await studentService.updateCertificate(userId, parseInt(certId), { type, reason, selectedAchievements });
        if (!result) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Cannot edit this certificate request. Either it doesn't exist, is no longer pending, or is more than 24 hours old." }));
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (dbErr) {
        console.error("Database error:", dbErr);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to update certificate" }));
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to process request" }));
  }
};
