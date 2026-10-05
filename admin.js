/**
 * CineVault - Admin Dashboard Controller
 */

let allAdminMovies = [];
let editingMovieId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

async function initAdminDashboard() {
  const user = Api.getUser();
  if (!user || (user.role !== 'ROLE_ADMIN' && user.role !== 'ADMIN')) {
    Api.showToast('Unauthorized access. Admin privileges required.', 'error');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }

  // Bind Tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';

      if (targetId === 'tabAddMovie' && !editingMovieId) {
        resetAddMovieForm();
      }
    });
  });

  // Init Form Submit & Drag/Drop
  initAddMovieForm();

  // Load Dashboard Data
  await loadStats();
  await loadMoviesTable();
  await loadUsersTable();
}

async function loadStats() {
  try {
    const res = await Api.getAdminStats();
    const stats = res.data;
    if (stats) {
      document.getElementById('statTotalMovies').textContent = stats.totalMovies || 0;
      document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
      document.getElementById('statTotalViews').textContent = stats.totalViews || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadMoviesTable() {
  try {
    const res = await Api.getAdminMovies();
    allAdminMovies = res.data || [];
    renderMoviesTable(allAdminMovies);
  } catch (err) {
    console.error('Failed to load movies table:', err);
    Api.showToast('Failed to load movies list', 'error');
  }
}

function renderMoviesTable(movies) {
  const tbody = document.getElementById('adminMoviesTableBody');
  if (!tbody) return;

  if (movies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;">No movies in database yet. Add your first movie!</td></tr>`;
    return;
  }

  tbody.innerHTML = movies.map(m => `
    <tr>
      <td>
        <img src="${m.posterPath || m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'" />
      </td>
      <td><strong>${m.title}</strong></td>
      <td><span class="badge-genre">${m.genre || 'Action'}</span></td>
      <td>${m.releaseYear || 2026}</td>
      <td><span class="rating-tag">⭐ ${m.rating ? m.rating.toFixed(1) : '8.5'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openEditModal(${m.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMovie(${m.id}, '${m.title.replace(/'/g, "\\'")}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function initAddMovieForm() {
  const form = document.getElementById('addMovieForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading & Saving...';

    const formData = new FormData(form);

    try {
      if (editingMovieId) {
        await Api.updateMovie(editingMovieId, formData);
        Api.showToast('Movie updated successfully! ✨', 'success');
      } else {
        await Api.addMovie(formData);
        Api.showToast('New Movie uploaded and published! 🚀', 'success');
      }

      resetAddMovieForm();

      // Reload admin views
      await loadStats();
      await loadMoviesTable();

      // Switch to movies table tab
      document.querySelector('[data-tab="tabMovies"]').click();

    } catch (err) {
      Api.showToast(err.message || 'Movie operation failed', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingMovieId ? 'UPDATE MOVIE' : 'ADD MOVIE';
    }
  });

  // Setup file preview labels & drag and drop
  setupFileDropzone('posterDropzone', 'posterFileInput', 'posterFileLabel');
  setupFileDropzone('videoDropzone', 'videoFileInput', 'videoFileLabel');
}

function setupFileDropzone(dropzoneId, inputId, labelId) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!input || !label || !dropzone) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target !== input) {
      input.click();
    }
  });

  input.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-red)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      input.files = files;
      updateFileLabel(input, label);
    }
  });

  input.addEventListener('change', () => updateFileLabel(input, label));
}

function updateFileLabel(input, label) {
  if (input.files && input.files[0]) {
    const sizeMb = (input.files[0].size / (1024 * 1024)).toFixed(1);
    label.textContent = `Selected: ${input.files[0].name} (${sizeMb} MB)`;
    label.style.color = '#10b981';
  }
}

function resetFilePreviews() {
  const pLabel = document.getElementById('posterFileLabel');
  const vLabel = document.getElementById('videoFileLabel');
  if (pLabel) { pLabel.textContent = 'Click or drag movie poster image here'; pLabel.style.color = ''; }
  if (vLabel) { vLabel.textContent = 'Click or drag movie video file (MP4/WebM) here'; vLabel.style.color = ''; }
}

function resetAddMovieForm() {
  editingMovieId = null;
  const form = document.getElementById('addMovieForm');
  if (form) form.reset();
  resetFilePreviews();
  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitMovieBtn');
  if (formTitle) formTitle.textContent = '➕ Add New Movie';
  if (submitBtn) submitBtn.textContent = 'ADD MOVIE';
}

function openEditModal(id) {
  const movie = allAdminMovies.find(m => m.id == id);
  if (!movie) return;

  editingMovieId = id;

  document.getElementById('movieTitleInput').value = movie.title || '';
  document.getElementById('movieDescInput').value = movie.description || '';
  document.getElementById('movieGenreInput').value = movie.genre || 'Action';
  document.getElementById('movieLanguageInput').value = movie.language || 'English';
  document.getElementById('movieYearInput').value = movie.releaseYear || 2026;
  document.getElementById('movieDurationInput').value = movie.duration || '2h 15m';
  document.getElementById('movieRatingInput').value = movie.rating || 8.5;
  const posterUrlInput = document.getElementById('moviePosterUrlInput');
  if (posterUrlInput) posterUrlInput.value = movie.posterPath || movie.posterUrl || '';
  const videoUrlInput = document.getElementById('movieVideoUrlInput');
  if (videoUrlInput) videoUrlInput.value = movie.videoPath || movie.videoUrl || '';

  // Switch to Form Tab
  const formTab = document.querySelector('[data-tab="tabAddMovie"]');
  if (formTab) {
    formTab.click();
    document.getElementById('formTitle').textContent = `✏️ Edit Movie: ${movie.title}`;
    document.getElementById('submitMovieBtn').textContent = 'UPDATE MOVIE';
  }
}

function confirmDeleteMovie(id, title) {
  if (confirm(`Are you sure you want to delete "${title}"?\n\nThis will immediately remove the movie from the platform and user watchlists!`)) {
    deleteMovie(id);
  }
}

async function deleteMovie(id) {
  try {
    await Api.deleteMovie(id);
    Api.showToast('Movie deleted successfully!', 'success');
    await loadStats();
    await loadMoviesTable();
  } catch (err) {
    Api.showToast('Failed to delete movie', 'error');
  }
}

async function loadUsersTable() {
  try {
    const res = await Api.getAdminUsers();
    const users = res.data || [];
    renderUsersTable(users);
  } catch (err) {
    console.error('Failed to load users table:', err);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.email}</td>
      <td>
        <span class="tag" style="background:${(u.role === 'ROLE_ADMIN' || u.role === 'ADMIN') ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.08)'}; color:${(u.role === 'ROLE_ADMIN' || u.role === 'ADMIN') ? '#ff0055' : '#cbd5e1'}">
          ${(u.role === 'ROLE_ADMIN' || u.role === 'ADMIN') ? 'ADMIN' : 'USER'}
        </span>
      </td>
      <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}</td>
      <td><span style="color:#10b981; font-weight:700;">● Active</span></td>
    </tr>
  `).join('');
}
