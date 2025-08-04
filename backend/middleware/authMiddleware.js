exports.getRoleFromCookie = (req) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/role=(\w+)/);
  return match ? match[1] : null;
};

exports.protect = (allowedRoles = []) => {
  return (req, res, next) => {
    const role = exports.getRoleFromCookie(req);
    if (!role || !allowedRoles.includes(role)) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    next(); // continue if role is allowed
  };
};
