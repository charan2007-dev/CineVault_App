/**
 * CineVault - My List (Watchlist) Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initMyListPage();
});

async function initMyListPage() {
  const user = Api.getUser();
  if (!user) {
    Api.showToast('Please login to view your Watchlist!', 'info');
    setTimeout(() => window.location.href = '/login.html', 1200);
    return;
  }

  try {
    const res = await Api.getWatchlist();
    const watchlist = res.data || [];
    renderWatchlist(watchlist);
  } catch (err) {
    console.error('Failed to load watchlist:', err);
    Api.showToast('Error loading your list', 'error');
  }
}

function renderWatchlist(movies) {
  const grid = document.getElementById('myListGrid');
  const countSpan = document.getElementById('myListCount');

  if (countSpan) {
    countSpan.textContent = `${movies.length} saved movies`;
  }

  if (!grid) return;

  if (movies.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">♡</div>
        <h3>Your List is Empty</h3>
        <p>Explore movies and click "+ MY LIST" to save them here for later!</p>
        <a href="/movies.html" class="btn btn-primary" style="margin-top: 1.5rem;">Explore Movies</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = movies.map(movie => `
    <div class="movie-card" id="watchlist-card-${movie.id}">
      <div class="poster-wrapper">
        <img src="${movie.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'" />
        <div class="card-overlay">
          <div class="overlay-actions">
            <button class="btn btn-primary btn-sm" onclick="window.location.href='/watch.html?id=${movie.id}'">▶ Watch Now</button>
            <button class="btn btn-danger btn-sm" onclick="removeWatchlistItem(${movie.id})">🗑 Remove</button>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h4 class="movie-card-title">${movie.title}</h4>
        <div class="movie-card-meta">
          <span class="rating-tag">⭐ ${movie.rating ? movie.rating.toFixed(1) : '8.5'}</span>
          <span class="badge-genre">${movie.genre || 'Action'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function removeWatchlistItem(movieId) {
  try {
    await Api.removeFromWatchlist(movieId);
    Api.showToast('Removed from My List', 'info');

    const card = document.getElementById(`watchlist-card-${movieId}`);
    if (card) {
      card.style.transform = 'scale(0.8)';
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
        const remaining = document.querySelectorAll('.movie-card');
        const countSpan = document.getElementById('myListCount');
        if (countSpan) countSpan.textContent = `${remaining.length} saved movies`;
        if (remaining.length === 0) {
          renderWatchlist([]);
        }
      }, 300);
    }
  } catch (err) {
    Api.showToast('Failed to remove item', 'error');
  }
}
