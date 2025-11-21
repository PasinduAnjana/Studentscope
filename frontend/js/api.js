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
    // Add other teacher endpoints here as we refactor
  },
};

// Expose api to window
window.api = api;
