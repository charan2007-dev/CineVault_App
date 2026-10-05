/**
 * CineVault - Movie Details Page Controller
 */

let currentMovieId = null;
let isInWatchlistState = false;

document.addEventListener('DOMContentLoaded', () => {
  initMovieDetailsPage();
});

async function initMovieDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  currentMovieId = urlParams.get('id');

  if (!currentMovieId) {
    window.location.href = '/movies.html';
    return;
  }

  try {
    // 1. Fetch movie info
    const movieRes = await Api.getMovieById(currentMovieId);
    const movie = movieRes.data;

    if (!movie) {
      Api.showToast('Movie not found', 'error');
      setTimeout(() => window.location.href = '/movies.html', 1500);
      return;
    }

    renderMovieDetails(movie);

    // 2. Check Watchlist status if user logged in
    const user = Api.getUser();
    if (user) {
      try {
        const checkRes = await Api.checkWatchlistStatus(currentMovieId);
        isInWatchlistState = checkRes.data === true;
        updateWatchlistButton();
      } catch (e) {}
    }

    // 3. Load More Like This
    if (movie.genre) {
      const genreRes = await Api.getMoviesByGenre(movie.genre);
      const related = (genreRes.data || []).filter(m => m.id != movie.id);
      renderMoreLikeThis(related);
    }

  } catch (err) {
    console.error('Failed to load movie details:', err);
    Api.showToast('Error loading movie details', 'error');
  }
}

function renderMovieDetails(movie) {
  document.title = `${movie.title} - CineVault`;
  const posterUrl = movie.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';
  const backdropUrl = movie.posterPath || posterUrl;

  const backdropSec = document.getElementById('detailsBackdrop');
  if (backdropSec) {
    backdropSec.style.backgroundImage = `url('${backdropUrl}')`;
  }

  const container = document.getElementById('detailsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="details-poster">
      <img src="${posterUrl}" alt="${movie.title}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'" />
    </div>
    <div class="details-info">
      <h1 class="details-title">${movie.title}</h1>
      <div class="details-tags">
        <span class="tag tag-rating">⭐ ${movie.rating ? movie.rating.toFixed(1) : '8.5'} Rating</span>
        <span class="tag">📅 ${movie.releaseYear || 2026}</span>
        <span class="tag">⏱️ ${movie.duration || '2h 15m'}</span>
        <span class="tag">🎭 ${movie.genre || 'Action'}</span>
        <span class="tag">🌐 ${movie.language || 'English'}</span>
      </div>
      <p class="details-synopsis">${movie.description || 'No description available for this title.'}</p>
      
      <div style="display: flex; gap: 1.2rem; align-items: center; flex-wrap: wrap;">
        <a href="/watch.html?id=${movie.id}" class="btn btn-primary" style="padding: 0.9rem 2.2rem; font-size: 1.1rem;">
          ▶ WATCH NOW
        </a>
        <button id="myListBtn" class="btn btn-secondary" onclick="handleWatchlistClick()" style="padding: 0.9rem 1.8rem;">
          + MY LIST
        </button>
      </div>
    </div>
  `;
}

function updateWatchlistButton() {
  const btn = document.getElementById('myListBtn');
  if (!btn) return;

  if (isInWatchlistState) {
    btn.innerHTML = '✓ IN MY LIST';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
    btn.style.background = 'rgba(16, 185, 129, 0.2)';
    btn.style.borderColor = '#10b981';
    btn.style.color = '#10b981';
  } else {
    btn.innerHTML = '+ MY LIST';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

async function handleWatchlistClick() {
  const user = Api.getUser();
  if (!user) {
    Api.showToast('Please login to manage your watchlist!', 'error');
    setTimeout(() => window.location.href = '/login.html', 1200);
    return;
  }

  try {
    if (isInWatchlistState) {
      await Api.removeFromWatchlist(currentMovieId);
      isInWatchlistState = false;
      Api.showToast('Removed from My List', 'info');
    } else {
      await Api.addToWatchlist(currentMovieId);
      isInWatchlistState = true;
      Api.showToast('Added to My List! ❤️', 'success');
    }
    updateWatchlistButton();
  } catch (err) {
    Api.showToast(err.message || 'Action failed', 'error');
  }
}

function renderMoreLikeThis(movies) {
  const container = document.getElementById('moreLikeThisGrid');
  if (!container) return;

  if (!movies || movies.length === 0) {
    container.innerHTML = `<p class="text-muted">No similar movies found in this genre.</p>`;
    return;
  }

  container.innerHTML = movies.slice(0, 4).map(m => createMovieCardHTML(m)).join('');
}
