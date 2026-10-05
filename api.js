/**
 * CineVault - Centralized API Service & Helpers
 */

const API_BASE = '/api';

const Api = {
  // Token & User session handlers
  getToken() {
    return localStorage.getItem('cinevault_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('cinevault_token', token);
    } else {
      localStorage.removeItem('cinevault_token');
    }
  },

  getUser() {
    const token = this.getToken();
    if (!token) return null;
    const raw = localStorage.getItem('cinevault_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('cinevault_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cinevault_user');
    }
  },

  logout() {
    localStorage.removeItem('cinevault_token');
    localStorage.removeItem('cinevault_user');
    window.location.href = '/login.html';
  },

  // Central Request Handler
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type if FormData is used
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        data = { message: text };
      }

      if (!response.ok) {
        let errorMsg = (data && (data.message || data.error)) || `Request failed with status ${response.status}`;
        if (response.status === 401) {
          errorMsg = `401 Unauthorized - ${data && data.message ? data.message : 'Please login as administrator'}`;
          if (!endpoint.startsWith('/auth/login')) {
            setTimeout(() => this.logout(), 2500);
          }
        } else if (response.status === 403) {
          errorMsg = `403 Forbidden - Admin privileges required`;
        } else if (response.status === 400) {
          errorMsg = `400 Bad Request - ${errorMsg}`;
        } else if (response.status === 500) {
          errorMsg = `500 Server Error - ${errorMsg}`;
        }
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to CineVault backend server.');
      }
      throw error;
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Auth Endpoints
  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getCurrentUser() {
    return this.request('/auth/me');
  },

  // Movies Public Endpoints
  getMovies() {
    return this.request('/movies');
  },

  getMovieById(id) {
    return this.request(`/movies/${id}`);
  },

  searchMovies(query) {
    return this.request(`/movies/search?query=${encodeURIComponent(query)}`);
  },

  getMoviesByGenre(genre) {
    return this.request(`/movies/genre/${encodeURIComponent(genre)}`);
  },

  getTrendingMovies() {
    return this.request('/movies/trending');
  },

  getTopRatedMovies() {
    return this.request('/movies/top-rated');
  },

  getRecentlyAddedMovies() {
    return this.request('/movies/recently-added');
  },

  // User Watchlist & History
  getWatchlist() {
    return this.request('/user/watchlist');
  },

  addToWatchlist(movieId) {
    return this.request(`/user/watchlist/${movieId}`, { method: 'POST' });
  },

  removeFromWatchlist(movieId) {
    return this.request(`/user/watchlist/${movieId}`, { method: 'DELETE' });
  },

  checkWatchlistStatus(movieId) {
    return this.request(`/user/watchlist/check/${movieId}`);
  },

  getUserProfile() {
    return this.request('/user/profile');
  },

  getWatchHistory() {
    return this.request('/user/history');
  },

  recordWatch(movieId) {
    return this.request(`/user/history/${movieId}`, { method: 'POST' });
  },

  // Admin Endpoints
  getAdminStats() {
    return this.request('/admin/stats');
  },

  getAdminMovies() {
    return this.request('/admin/movies');
  },

  addMovie(formData) {
    return this.request('/admin/movies', {
      method: 'POST',
      body: formData
    });
  },

  updateMovie(id, formData) {
    return this.request(`/admin/movies/${id}`, {
      method: 'PUT',
      body: formData
    });
  },

  deleteMovie(id) {
    return this.request(`/admin/movies/${id}`, { method: 'DELETE' });
  },

  getAdminUsers() {
    return this.request('/admin/users');
  }
};
