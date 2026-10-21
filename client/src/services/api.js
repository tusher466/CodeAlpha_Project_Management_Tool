const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('collabtask_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('collabtask_token', token);
    } else {
      localStorage.removeItem('collabtask_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('collabtask_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Clear token on unauthorized if not login/register
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          this.setToken(null);
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  getCurrentUser() {
    return this.request('/auth/me');
  }

  getUsers() {
    return this.request('/auth/users');
  }

  quickLogin(userId) {
    return this.request('/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // Projects
  getProjects() {
    return this.request('/projects');
  }

  getProject(id) {
    return this.request(`/projects/${id}`);
  }

  createProject(data) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateProject(id, data) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    });
  }

  addProjectMember(projectId, data) {
    return this.request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  removeProjectMember(projectId, userId) {
    return this.request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  // Columns
  createColumn(projectId, data) {
    return this.request(`/${projectId}/columns`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateColumn(columnId, data) {
    return this.request(`/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  reorderColumns(projectId, columnIds) {
    return this.request(`/${projectId}/columns/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ columnIds })
    });
  }

  deleteColumn(columnId) {
    return this.request(`/columns/${columnId}`, {
      method: 'DELETE'
    });
  }

  // Tasks
  getTask(taskId) {
    return this.request(`/tasks/${taskId}`);
  }

  createTask(projectId, data) {
    return this.request(`/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateTask(taskId, data) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  moveTask(taskId, data) {
    return this.request(`/tasks/${taskId}/move`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  // Checklist
  addChecklistItem(taskId, title) {
    return this.request(`/tasks/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  updateChecklistItem(taskId, itemId, data) {
    return this.request(`/tasks/${taskId}/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteChecklistItem(taskId, itemId) {
    return this.request(`/tasks/${taskId}/checklist/${itemId}`, {
      method: 'DELETE'
    });
  }

  // Comments
  getComments(taskId) {
    return this.request(`/tasks/${taskId}/comments`);
  }

  createComment(taskId, content) {
    return this.request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  }

  // Notifications
  getNotifications() {
    return this.request('/notifications');
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT'
    });
  }

  deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE'
    });
  }
}

export const api = new ApiService();
