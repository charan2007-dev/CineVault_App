/**
 * CineVault - Common UI & Auth Header Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSearch();
});

function initNavbar() {
  const user = Api.getUser();
  const navActions = document.querySelector('.nav-actions');
  const navLinks = document.querySelector('.nav-links');

  // Inject Admin link if user is ADMIN
  if (user && user.role === 'ROLE_ADMIN') {
    if (navLinks && !document.querySelector('.admin-nav-item')) {
      const adminLi = document.createElement('li');
      adminLi.className = 'admin-nav-item';
      adminLi.innerHTML = `<a href="/admin.html" class="nav-link" style="color: var(--accent-red); font-weight:700;">⚙️ Admin</a>`;
      navLinks.appendChild(adminLi);
    }
  }

  // Render User Profile Badge or Login Button
  if (navActions) {
    if (user) {
      navActions.innerHTML = `
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="navSearchInput" placeholder="Search movies, genre..." />
        </div>
        <div class="user-badge" id="userMenuBtn">
          <div class="avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
          <span class="user-name">${user.username}</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Api.logout()">Logout</button>
      `;

      document.getElementById('userMenuBtn').addEventListener('click', () => {
        window.location.href = '/profile.html';
      });
    } else {
      navActions.innerHTML = `
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="navSearchInput" placeholder="Search movies..." />
        </div>
        <a href="/login.html" class="btn btn-secondary btn-sm">Login</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Sign Up</a>
      `;
    }
  }

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
}

function initSearch() {
  const searchInput = document.getElementById('navSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `/movies.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
}

// Utility to create HTML movie card element
function createMovieCardHTML(movie) {
  const posterUrl = movie.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';
  const rating = movie.rating ? movie.rating.toFixed(1) : '8.0';

  return `
    <div class="movie-card" onclick="window.location.href='/movie-details.html?id=${movie.id}'">
      <div class="poster-wrapper">
        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'" />
        <div class="card-overlay">
          <div class="overlay-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.location.href='/watch.html?id=${movie.id}'">▶ Watch Now</button>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); toggleMyList(${movie.id})">♡ Add to List</button>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h4 class="movie-card-title">${movie.title}</h4>
        <div class="movie-card-meta">
          <span class="rating-tag">⭐ ${rating}</span>
          <span>${movie.releaseYear || 2026}</span>
          <span class="badge-genre">${movie.genre || 'Action'}</span>
        </div>
      </div>
    </div>
  `;
}

async function toggleMyList(movieId) {
  const user = Api.getUser();
  if (!user) {
    Api.showToast('Please login to add movies to your list!', 'error');
    setTimeout(() => window.location.href = '/login.html', 1200);
    return;
  }

  try {
    const res = await Api.addToWatchlist(movieId);
    Api.showToast('Added to My List! ❤️', 'success');
  } catch (err) {
    Api.showToast(err.message || 'Already in My List!', 'info');
  }
}
