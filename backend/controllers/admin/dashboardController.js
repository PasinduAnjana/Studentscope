const adminService = require("../../services/adminService");

exports.getDashboard = async (req, res) => {
  try {
    const summary = await adminService.getDashboardStats();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(summary));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Failed to load dashboard" }));
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await adminService.getAllStudents();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Error fetching students:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch students" }));
  }
};

exports.getStudentProfile = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/");
    const studentId = parts[parts.length - 1];

    if (!studentId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student ID required" }));
    }

    const profile = await adminService.getStudentProfile(studentId);
    if (!profile) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(profile));
  } catch (err) {
    console.error("Error fetching student profile:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch student profile" }));
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/");
    const studentId = parts[parts.length - 2];
    const period = url.searchParams.get("period") || "last7";

    if (!studentId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student ID required" }));
    }

    const attendance = await adminService.getStudentAttendance(studentId, period);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(attendance));
  } catch (err) {
    console.error("Error fetching student attendance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch attendance" }));
  }
};

exports.getStudentMarks = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/");
    const studentId = parts[parts.length - 2];
    const grade = url.searchParams.get("grade");
    const term = url.searchParams.get("term") || null;

    if (!studentId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student ID required" }));
    }

    const marks = await adminService.getStudentMarks(
      studentId,
      grade ? parseInt(grade) : null,
      term
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(marks));
  } catch (err) {
    console.error("Error fetching student marks:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch marks" }));
  }
};

exports.getStudentBehavior = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/");
    const studentId = parts[parts.length - 2];

    if (!studentId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student ID required" }));
    }

    const behavior = await adminService.getStudentBehavior(studentId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(behavior));
  } catch (err) {
    console.error("Error fetching student behavior:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch behavior records" }));
  }
};

exports.getStudentGovExams = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.split("/");
    const studentId = parts[parts.length - 2];

    if (!studentId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Student ID required" }));
    }

    const govExams = await adminService.getStudentGovExams(studentId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(govExams));
  } catch (err) {
    console.error("Error fetching student government exams:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch government exams" }));
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await adminService.getAllClasses();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(classes));
  } catch (err) {
    console.error("Error fetching classes:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch classes" }));
  }
};

exports.getRecentAnnouncements = async (req, res) => {
  try {
    const announcements = await adminService.getRecentAnnouncements();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(announcements));
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch announcements" }));
  }
};

exports.getAcademicPerformance = async (req, res) => {
  try {
    const performance = await adminService.getAcademicPerformanceByGrade();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(performance));
  } catch (err) {
    console.error("Error fetching academic performance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch academic performance" }));
  }
};

exports.getSubjectPerformance = async (req, res) => {
  try {
    const performance = await adminService.getSubjectPerformance();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(performance));
  } catch (err) {
    console.error("Error fetching subject performance:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch subject performance" }));
  }
};

exports.getTopPerformers = async (req, res) => {
  try {
    const performers = await adminService.getTopPerformers();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(performers));
  } catch (err) {
    console.error("Error fetching top performers:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch top performers" }));
  }
};

exports.getStudentsNeedingAttention = async (req, res) => {
  try {
    const students = await adminService.getStudentsNeedingAttention();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  } catch (err) {
    console.error("Error fetching students needing attention:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Failed to fetch students needing attention" })
    );
  }
};

exports.getRecentExams = async (req, res) => {
  try {
    const exams = await adminService.getRecentExams();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(exams));
  } catch (err) {
    console.error("Error fetching recent exams:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch recent exams" }));
  }
};

exports.getPerformanceDistribution = async (req, res) => {
  try {
    const distribution = await adminService.getPerformanceDistribution();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(distribution));
  } catch (err) {
    console.error("Error fetching performance distribution:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Failed to fetch performance distribution" })
    );
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await adminService.getAllTeachers();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(teachers));
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch teachers" }));
  }
};

exports.getAllClerks = async (req, res) => {
  try {
    const clerks = await adminService.getAllClerks();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(clerks));
  } catch (err) {
    console.error("Error fetching clerks:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch clerks" }));
  }
};

// ============ ACADEMIC REPORTS ============

exports.getAcademicReportsFilters = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const examId = url.searchParams.get("exam_id") || null;
    const classId = url.searchParams.get("class_id") || null;
    const filters = await adminService.getAcademicReportsFilters(examId, classId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(filters));
  } catch (err) {
    console.error("Error fetching academic report filters:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch filters" }));
  }
};

exports.getAcademicReportsData = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filters = {
      exam_id: url.searchParams.get("exam_id") || null,
      class_id: url.searchParams.get("class_id") || null,
      subject_id: url.searchParams.get("subject_id") || null,
      search: url.searchParams.get("search") || null,
    };
    const data = await adminService.getAcademicReportsData(filters);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error("Error fetching academic report data:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch report data" }));
  }
};

exports.getAcademicReportsSummary = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filters = {
      exam_id: url.searchParams.get("exam_id") || null,
      class_id: url.searchParams.get("class_id") || null,
      subject_id: url.searchParams.get("subject_id") || null,
    };
    const summary = await adminService.getAcademicReportsSummary(filters);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(summary));
  } catch (err) {
    console.error("Error fetching academic report summary:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to fetch report summary" }));
  }
};
