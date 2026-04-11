const adminService = require("../../services/adminService");

exports.getPendingPasswordResets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const resets = await adminService.getPendingPasswordResets();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(resets));
  } catch (err) {
    console.error("Error getting pending password resets:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to get pending password resets" }));
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
    const result = await adminService.approvePasswordReset(resetId, userId);

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
    const result = await adminService.rejectPasswordReset(resetId, userId);

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

// ============ CERTIFICATES ============
exports.getCertificates = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const filters = {
      status: url.searchParams.get("status") || "all",
      type: url.searchParams.get("type") || "all",
      class_id: url.searchParams.get("class_id") || null,
      search: url.searchParams.get("search") || null,
    };

    const certificates = await adminService.getCertificates(filters);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(certificates));
  } catch (err) {
    console.error("Error getting certificates:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to get certificates" }));
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const certId = parseInt(req.url.split("/api/admin/certificates/")[1].split("?")[0]);
    const certificate = await adminService.getCertificateById(certId);

    if (!certificate) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Certificate not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(certificate));
  } catch (err) {
    console.error("Error getting certificate:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to get certificate" }));
  }
};

exports.approveCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const certId = parseInt(req.certId);
    const result = await adminService.approveCertificate(certId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error("Error approving certificate:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to approve certificate" }));
  }
};

exports.rejectCertificate = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const certId = parseInt(req.certId);
    const result = await adminService.rejectCertificate(certId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error("Error rejecting certificate:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to reject certificate" }));
  }
};

// ============ SCHOOL DETAILS ============
exports.getSchoolDetails = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const details = await adminService.getSchoolDetails();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(details || {}));
  } catch (err) {
    console.error("Error getting school details:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to get school details" }));
  }
};

exports.updateSchoolDetails = async (req, res) => {
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
        const result = await adminService.updateSchoolDetails(data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (parseErr) {
        console.error("Parse error:", parseErr);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request body" }));
      }
    });
  } catch (err) {
    console.error("Error updating school details:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to update school details" }));
  }
};
