const authService = require("../services/authService");

// Updated to use session tokens instead of role cookies
exports.getSessionFromCookie = async (req) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sessionToken=([^;]+)/);
  const sessionToken = match ? match[1] : null;

  if (!sessionToken) return null;

  const session = await authService.getSession(sessionToken);
  return session;
};

exports.protect = (allowedRoles = []) => {
  return async (req, res, next) => {
    const session = await exports.getSessionFromCookie(req);

    if (!session || !allowedRoles.includes(session.role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Attach user info to request for use in controllers
    req.user = session;
    next(); // continue if role is allowed
  };
};

// Updated to use session instead of direct userId cookie
exports.getUserIdFromCookie = async (req) => {
  const session = await exports.getSessionFromCookie(req);
  return session ? session.userId : null;
};

exports.protectUserId = async (req, res, next) => {
  const session = await exports.getSessionFromCookie(req);

  if (!session) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // Attach user info to request
  req.user = session;
  next(); // continue if session is valid
};

// Legacy function for backward compatibility (now gets role from session)
exports.getRoleFromCookie = async (req) => {
  const session = await exports.getSessionFromCookie(req);
  return session ? session.role : null;
};
