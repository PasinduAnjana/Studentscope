const AchievementsService = require("../services/achievementsService");

// Helper to read request body
const getBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

const AchievementsController = {
  getAll: async (req, res) => {
    try {
      const achievements = await AchievementsService.getAllWithStudentDetails();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(achievements));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch achievements" }));
    }
  },

  create: async (req, res) => {
    try {
      const data = await getBody(req);
      if (!data.student_id || !data.title || !data.category) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Missing required fields" }));
      }
      
      const categoryErrors = !['academic', 'sports', 'arts', 'other'].includes(data.category);
      if (categoryErrors) {
         res.writeHead(400, { "Content-Type": "application/json" });
         return res.end(JSON.stringify({ error: "Invalid category" }));
      }

      const achievement = await AchievementsService.create(data);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(achievement));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to create achievement" }));
    }
  },

  update: async (req, res, id) => {
    try {
      const data = await getBody(req);
      const updated = await AchievementsService.update(id, data);
      if (!updated) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Achievement not found" }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(updated));
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to update achievement" }));
    }
  },

  delete: async (req, res, id) => {
    try {
      await AchievementsService.delete(id);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Achievement deleted" }));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to delete achievement" }));
    }
  },
};

module.exports = AchievementsController;
