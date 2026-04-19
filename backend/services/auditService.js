const pool = require("../db");

exports.logAction = async (userId, action, targetType, targetId, oldValues, newValues) => {
  try {
    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, targetType, targetId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
    return { success: true };
  } catch (err) {
    console.error("Error logging audit action:", err);
    return { success: false, error: err.message };
  }
};

exports.getAuditLogs = async (filters = {}) => {
  try {
    let query = `SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id`;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.action) {
      conditions.push(`al.action = $${paramIndex++}`);
      params.push(filters.action);
    }
    if (filters.targetType) {
      conditions.push(`al.target_type = $${paramIndex++}`);
      params.push(filters.targetType);
    }
    if (filters.userId) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      params.push(filters.userId);
    }
    if (filters.startDate) {
      conditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY al.created_at DESC";

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    } else {
      query += " LIMIT 100";
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error("Error getting audit logs:", err);
    return [];
  }
};