const auditService = require("../../services/auditService");

exports.getAuditLogs = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filters = {
      action: url.searchParams.get("action"),
      targetType: url.searchParams.get("target_type"),
      userId: url.searchParams.get("user_id"),
      startDate: url.searchParams.get("start_date"),
      endDate: url.searchParams.get("end_date"),
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")) : 100
    };

    const logs = await auditService.getAuditLogs(filters);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(logs));
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch audit logs" }));
  }
};