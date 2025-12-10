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
      getAllSubjects: (classId) =>
        api.request(`/teacher/classes/${classId}/subjects/all`),
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
    },
  },

  // Student endpoints
  student: {
    achievements: {
      getAll: () => api.request("/student/achievements"),
    },
  },

  data: {
    getTimeSlots: () => fetch("/data/time.json").then((res) => res.json()),
  },
};

// Expose api to window
window.api = api;
