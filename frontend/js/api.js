/**
 * Centralized API module for StudentScope
 */
const api = {
  baseUrl: "/api",

  /**
   * Generic request handler
   * @param {string} endpoint - API endpoint (e.g., '/auth/me')
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {object} body - Request body (optional)
   * @returns {Promise<Response>}
   */
  async request(endpoint, method = "GET", body = null) {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(this.baseUrl + endpoint, options);
  },

  // Auth endpoints
  auth: {
    me: () => api.request("/auth/me"),
    login: (data) => api.request("/auth/login", "POST", data),
    logout: () => api.request("/auth/logout", "POST"),
    verifyUser: (data) => api.request("/auth/verify-user", "POST", data),
    requestPasswordReset: (data) =>
      api.request("/auth/request-password-reset", "POST", data),
  },

  // Teacher endpoints
  teacher: {
    todos: {
      getAll: () => api.request("/teacher/todos"),
      create: (text) => api.request("/teacher/todos", "POST", { text }),
      update: (id, text) =>
        api.request(`/teacher/todos/${id}`, "PUT", { text }),
      delete: (id) => api.request(`/teacher/todos/${id}`, "DELETE"),
      updateStatus: (id, status) =>
        api.request(`/teacher/todos/${id}/status`, "PUT", { status }),
    },
    classes: {
      getAll: () => api.request("/teacher/classes"),
      getTeacherClasses: () => api.request("/teacher/classes/teacher"),
      getInfo: (classId) => api.request(`/teacher/classes/${classId}/info`),

      getTeacherSubjects: (classId) =>
        api.request(`/teacher/classes/${classId}/subjects/teacher`),
      getSubjectAssignment: (classId) =>
        api.request(`/teacher/subjects/assignment/${classId}`),
    },
    timetable: {
      getWeek: () => api.request("/teacher/timetable/week"),
      getToday: () => api.request("/teacher/timetable/today"),
    },
    attendance: {
      getByDate: (date) =>
        api.request(`/teacher/attendance?date=${encodeURIComponent(date)}`),
      getWeekly: () => api.request("/teacher/attendance/weekly"),
      getMonthly: () => api.request("/teacher/attendance/monthly"),
      save: (data) => api.request("/teacher/attendance", "POST", data),
      delete: (date) =>
        api.request(
          `/teacher/attendance?date=${encodeURIComponent(date)}`,
          "DELETE"
        ),
    },
    students: {
      getAll: () => api.request("/teacher/students"),
      getByClass: (classId) =>
        api.request(`/teacher/students/class/${classId}`),
      saveSubjectAssignments: (assignments) =>
        api.request("/teacher/students/subjects/batch", "POST", {
          assignments,
        }),
      saveStudentSubjects: (studentId, subjectIds) =>
        api.request(`/teacher/students/${studentId}/subjects`, "POST", {
          subject_ids: subjectIds,
        }),
    },
    announcements: {
      getAll: () => api.request("/teacher/announcements"),
      getReceived: () => api.request("/teacher/announcements/received"),
      create: (data) => api.request("/teacher/announcements", "POST", data),
      delete: (id) => api.request(`/teacher/announcements/${id}`, "DELETE"),
    },
    marks: {
      getData: () => api.request("/teacher/marks/data"),
      save: (data) => api.request("/teacher/marks", "POST", data),
      get: (classId, subjectId, examId) => api.request(`/teacher/marks?classId=${classId}&subjectId=${subjectId}&examId=${examId}`),
    },
    exams: {
      getAll: () => api.request("/teacher/exams"),
    },
    behavior: {
      getRecords: () => api.request("/teacher/behavior/records"),
      addRecord: (data) =>
        api.request("/teacher/behavior/records", "POST", data),
      deleteRecord: (id) =>
        api.request(`/teacher/behavior/records?id=${id}`, "DELETE"),
    },
    profile: {
      get: () => api.request("/teacher/profile"),
      getClasses: () => api.request("/teacher/profile/classes"),
      changePassword: (data) =>
        api.request("/teacher/change-password", "PUT", data),
    },
    passwordResets: {
      getPending: () => api.request("/teacher/password-resets/pending"),
      approve: (id) =>
        api.request(`/teacher/password-resets/${id}/approve`, "POST"),
      reject: (id) =>
        api.request(`/teacher/password-resets/${id}/reject`, "POST"),
    },
  },

  // Clerk endpoints
  clerk: {
    achievements: {
      getAll: () => api.request("/clerk/achievements"),
      create: (data) => api.request("/clerk/achievements", "POST", data),
      update: (id, data) =>
        api.request(`/clerk/achievements/${id}`, "PUT", data),
      delete: (id) => api.request(`/clerk/achievements/${id}`, "DELETE"),
    },
    students: {
      getAll: () => api.request("/clerk/students"),
      create: (data) => api.request("/clerk/students", "POST", data),
      update: (id, data) => api.request(`/clerk/students/${id}`, "PUT", data),
      delete: (id) => api.request(`/clerk/students/${id}`, "DELETE"),
    },
    classes: {
      getAll: () => api.request("/clerk/classes"),
      create: (data) => api.request("/clerk/classes", "POST", data),
      update: (id, data) => api.request(`/clerk/classes/${id}`, "PUT", data),
      delete: (id) => api.request(`/clerk/classes/${id}`, "DELETE"),
    },
    teachers: {
      getAll: () => api.request("/clerk/teachers"),
      create: (data) => api.request("/clerk/teachers", "POST", data),
      update: (id, data) => api.request(`/clerk/teachers/${id}`, "PUT", data),
      delete: (id) => api.request(`/clerk/teachers/${id}`, "DELETE"),
    },
    notices: {
      getAll: () => api.request("/clerk/notices"),
      create: (data) => api.request("/clerk/notices", "POST", data),
      update: (id, data) => api.request(`/clerk/notices/${id}`, "PUT", data),
      delete: (id) => api.request(`/clerk/notices/${id}`, "DELETE"),
    },
    announcements: {
      getAll: () => api.request("/clerk/announcements"),
      create: (data) => api.request("/clerk/announcements", "POST", data),
      delete: (id) => api.request(`/clerk/announcements/${id}`, "DELETE"),
    },
    profile: {
      get: () => api.request("/clerk/profile"),
      update: (data) => api.request("/clerk/profile", "PUT", data),
      changePassword: (data) => api.request("/clerk/change-password", "PUT", data),
    },
    dashboard: {
      getStats: () => api.request("/clerk/stats"),
    },
    exams: {
      getAll: (year) => api.request(year ? `/clerk/exams?year=${year}` : "/clerk/exams"),
      create: (data) => api.request("/clerk/exams", "POST", data),
      getStudents: (id) => api.request(`/clerk/exams/${id}/students`),
      assignStudents: (id, studentIds) => api.request(`/clerk/exams/${id}/students`, "POST", { student_ids: studentIds }),
      saveMarks: (id, marks) => api.request(`/clerk/exams/${id}/marks`, "POST", { marks }),
      getMarks: (id, subjectId) => api.request(`/clerk/exams/${id}/marks?subjectId=${subjectId}`),
      getSubjects: (id) => api.request(`/clerk/exams/${id}/subjects`),
      getAllMarks: (id) => api.request(`/clerk/exams/${id}/all-marks`),
      updateIndex: (examId, studentId, indexNumber) => api.request(`/clerk/exams/${examId}/index`, "PATCH", { student_id: studentId, index_number: indexNumber }),
      bulkImportIndex: (examId, entries) => api.request(`/clerk/exams/${examId}/import-index`, "POST", { entries }),
    },

  },

  // Admin endpoints
  admin: {
    dashboard: {
      get: () => api.request("/admin/dashboard"),
    },
    students: {
      getAll: () => api.request("/admin/students"),
      getProfile: (id) => api.request(`/admin/students/${id}`),
      getAttendance: (id, period = "last7") =>
        api.request(`/admin/students/${id}/attendance?period=${period}`),
      getMarks: (id, grade, term) =>
        api.request(`/admin/students/${id}/marks?grade=${grade}&term=${term || ""}`),
      getBehavior: (id) => api.request(`/admin/students/${id}/behavior`),
      getGovExams: (id) => api.request(`/admin/students/${id}/gov-exams`),
    },
    classes: {
      getAll: () => api.request("/admin/classes"),
    },
    behavior: {
      getStats: () => api.request("/admin/behavior/stats"),
      getRecords: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.class_id) params.set("class_id", filters.class_id);
        if (filters.type) params.set("type", filters.type);
        if (filters.start_date) params.set("start_date", filters.start_date);
        if (filters.end_date) params.set("end_date", filters.end_date);
        const qs = params.toString();
        return api.request(qs ? `/admin/behavior/records?${qs}` : "/admin/behavior/records");
      },
      addRecord: (data) => api.request("/admin/behavior/records", "POST", data),
      deleteRecord: (id) => api.request(`/admin/behavior/records?id=${id}`, "DELETE"),
    },
    attendance: {
      getStats: (date) => api.request(`/admin/attendance/stats?date=${date}`),
      getRecords: (date, filters = {}) => {
        const params = new URLSearchParams({ date });
        if (filters.classId) params.set("classId", filters.classId);
        if (filters.status) params.set("status", filters.status);
        if (filters.search) params.set("search", filters.search);
        return api.request(`/admin/attendance/records?${params.toString()}`);
      },
      update: (data) => api.request("/admin/attendance", "PUT", data),
      delete: (id) => api.request(`/admin/attendance?id=${id}`, "DELETE"),
    },
    announcements: {
      getAll: () => api.request("/admin/announcements"),
      getRecent: () => api.request("/admin/announcements/recent"),
      create: (data) => api.request("/admin/announcements", "POST", data),
      update: (id, data) => api.request(`/admin/announcements/${id}`, "PUT", data),
      delete: (id) => api.request(`/admin/announcements/${id}`, "DELETE"),
    },
    events: {
      getAll: () => api.request("/admin/events"),
      create: (data) => api.request("/admin/events", "POST", data),
      delete: (id) => api.request(`/admin/events/${id}`, "DELETE"),
    },
    academic: {
      getPerformanceByGrade: () => api.request("/admin/academic/performance/grades"),
      getSubjectPerformance: () => api.request("/admin/academic/performance/subjects"),
      getTopPerformers: () => api.request("/admin/academic/top-performers"),
      getAttentionNeeded: () => api.request("/admin/academic/attention-needed"),
      getRecentExams: () => api.request("/admin/academic/recent-exams"),
      getPerformanceDistribution: () => api.request("/admin/academic/performance-distribution"),
      getReportsFilters: () => api.request("/admin/academic/reports/filters"),
      getReportsData: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.exam_id) params.set("exam_id", filters.exam_id);
        if (filters.class_id) params.set("class_id", filters.class_id);
        if (filters.subject_id) params.set("subject_id", filters.subject_id);
        if (filters.search) params.set("search", filters.search);
        return api.request(`/admin/academic/reports/data?${params.toString()}`);
      },
      getReportsSummary: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.exam_id) params.set("exam_id", filters.exam_id);
        if (filters.class_id) params.set("class_id", filters.class_id);
        if (filters.subject_id) params.set("subject_id", filters.subject_id);
        return api.request(`/admin/academic/reports/summary?${params.toString()}`);
      },
    },
    teachers: {
      getAll: () => api.request("/admin/teachers"),
    },
    clerks: {
      getAll: () => api.request("/admin/clerks"),
    },
    passwordResets: {
      getPending: () => api.request("/admin/password-resets/pending"),
      approve: (id) => api.request(`/admin/password-resets/${id}/approve`, "POST"),
      reject: (id) => api.request(`/admin/password-resets/${id}/reject`, "POST"),
    },
  },

  // Student endpoints
  student: {
    achievements: {
      getAll: () => api.request("/student/achievements"),
    },
    marks: {
      getRank: (examId) => api.request(examId ? `/student/marks/rank?examId=${examId}` : "/student/marks/rank"),
      getAverage: (examId) => api.request(examId ? `/student/marks/average?examId=${examId}` : "/student/marks/average"),
      getTermTests: () => api.request("/student/marks/term-tests"),
      getTermTestMarks: (examId) => api.request(`/student/marks/term-test?examId=${examId}`),
      getTrend: () => api.request("/student/marks/trend"),
    },
  },

  data: {
    getTimeSlots: () => fetch("/data/time.json").then((res) => res.json()),
  },
};

// Expose api to window
window.api = api;
