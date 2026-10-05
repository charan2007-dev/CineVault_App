/**
 * CineVault - Unified Single Page Application (SPA) Controller
 */

let currentView = 'home';
let currentMovieId = null;
let allLoadedMovies = [];
let allAdminMovies = [];
let editingMovieId = null;
let isInWatchlistState = false;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSearch();
  initForms();
  
  // Read initial view from URL params or default to 'home'
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get('view') || 'home';
  const initialParams = {
    id: urlParams.get('id'),
    search: urlParams.get('search'),
    genre: urlParams.get('genre'),
    sort: urlParams.get('sort')
  };

  showView(initialView, initialParams, false);
});

// Handle Browser Back/Forward navigation
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) {
    showView(e.state.view, e.state.params, false);
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') || 'home';
    const params = {
      id: urlParams.get('id'),
      search: urlParams.get('search'),
      genre: urlParams.get('genre'),
      sort: urlParams.get('sort')
    };
    showView(view, params, false);
  }
});

/**
 * Main View Switcher
 */
async function showView(viewName, params = {}, pushState = true) {
  currentView = viewName;
  
  // Pause video if moving away from watch view
  const videoElement = document.getElementById('cineVaultVideo');
  if (videoElement && viewName !== 'watch') {
    videoElement.pause();
  }

  // Update URL Query without full page reload
  if (pushState) {
    const query = new URLSearchParams();
    query.set('view', viewName);
    if (params.id) query.set('id', params.id);
    if (params.search) query.set('search', params.search);
    if (params.genre) query.set('genre', params.genre);
    if (params.sort) query.set('sort', params.sort);
    
    const newUrl = `${window.location.pathname}?${query.toString()}`;
    history.pushState({ view: viewName, params }, '', newUrl);
  }

  // Hide all views
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
    sec.classList.remove('active-flex');
  });

  // Show selected view
  const targetId = 'view' + viewName.charAt(0).toUpperCase() + viewName.slice(1);
  const targetView = document.getElementById(targetId);
  
  if (targetView) {
    targetView.classList.add('active');
  } else {
    // Fallback to home view if view does not exist
    document.getElementById('viewHome').classList.add('active');
    currentView = 'home';
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update Header & Auth UI
  updateNavbarState();

  // Show/Hide Footer
  const mainFooter = document.getElementById('mainFooter');
  if (mainFooter) {
    mainFooter.style.display = (viewName === 'login' || viewName === 'register') ? 'none' : 'block';
  }

  // Route View Data Initialization
  try {
    switch (currentView) {
      case 'home':
        await initHomeView();
        break;
      case 'movies':
        await initMoviesView(params);
        break;
      case 'details':
        await initDetailsView(params);
        break;
      case 'watch':
        await initWatchView(params);
        break;
      case 'mylist':
        await initMyListView();
        break;
      case 'profile':
        await initProfileView();
        break;
      case 'login':
        initLoginView();
        break;
      case 'register':
        initRegisterView();
        break;
      case 'admin':
        await initAdminView();
        break;
    }
  } catch (err) {
    console.error(`Error loading view [${currentView}]:`, err);
  }
}

/**
 * Navbar & Header Controller
 */
function initNavbar() {
  updateNavbarState();

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.getElementById('mainNavLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
}

function updateNavbarState() {
  const user = Api.getUser();
  const navActions = document.getElementById('mainNavActions');
  const navLinks = document.getElementById('mainNavLinks');

  // Update active class on nav links
  if (navLinks) {
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      const dataNav = link.getAttribute('data-nav');
      if (dataNav === currentView) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Admin nav link injection/removal
    let adminLi = navLinks.querySelector('.admin-nav-item');
    if (user && (user.role === 'ROLE_ADMIN' || user.role === 'ADMIN')) {
      if (!adminLi) {
        adminLi = document.createElement('li');
        adminLi.className = 'admin-nav-item';
        adminLi.innerHTML = `<a href="#" onclick="showView('admin'); return false;" class="nav-link" style="color: var(--accent-red); font-weight:700;">⚙️ Admin</a>`;
        navLinks.appendChild(adminLi);
      }
    } else if (adminLi) {
      adminLi.remove();
    }
  }

  // Render User Profile Badge or Login Buttons
  if (navActions) {
    if (user) {
      navActions.innerHTML = `
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="navSearchInput" placeholder="Search movies, genre..." />
        </div>
        <div class="user-badge" id="userMenuBtn" onclick="showView('profile')">
          <div class="avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
          <span class="user-name">${user.username}</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="Api.logout()">Logout</button>
      `;
    } else {
      navActions.innerHTML = `
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="navSearchInput" placeholder="Search movies..." />
        </div>
        <button class="btn btn-secondary btn-sm" onclick="showView('login')">Login</button>
        <button class="btn btn-primary btn-sm" onclick="showView('register')">Sign Up</button>
      `;
    }
    initSearch();
  }
}

function initSearch() {
  const searchInput = document.getElementById('navSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          showView('movies', { search: query });
        }
      }
    });
  }
}

/**
 * 1. HOME VIEW LOGIC
 */
async function initHomeView() {
  try {
    const [trendingRes, topRatedRes, recentRes, allMoviesRes] = await Promise.all([
      Api.getTrendingMovies(),
      Api.getTopRatedMovies(),
      Api.getRecentlyAddedMovies(),
      Api.getMovies()
    ]);

    const trending = trendingRes.data || [];
    const topRated = topRatedRes.data || [];
    const recent = recentRes.data || [];
    const allMovies = allMoviesRes.data || [];

    const heroMovie = trending.length > 0 ? trending[0] : (allMovies[0] || null);
    if (heroMovie) {
      renderHeroSection(heroMovie);
    }

    renderMovieRow('trendingMovies', trending.length > 0 ? trending : allMovies);
    renderMovieRow('topRatedMovies', topRated.length > 0 ? topRated : allMovies);
    renderMovieRow('recentlyAddedMovies', recent.length > 0 ? recent : allMovies);

  } catch (err) {
    console.error('Failed to load home page content:', err);
  }
}

function renderHeroSection(movie) {
  const heroContainer = document.getElementById('heroSection');
  if (!heroContainer) return;

  const backdropUrl = movie.posterPath || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80';
  heroContainer.style.backgroundImage = `url('${backdropUrl}')`;

  heroContainer.innerHTML = `
    <div class="hero-overlay"></div>
    <div class="container" style="height: 100%; display: flex; align-items: center;">
      <div class="hero-content">
        <div class="hero-badge">🔥 Featured Movie</div>
        <h1 class="hero-title">${movie.title}</h1>
        <div class="hero-meta">
          <span class="rating-tag">⭐ ${movie.rating ? movie.rating.toFixed(1) : '8.8'}</span>
          <span>📅 ${movie.releaseYear || 2026}</span>
          <span>⏱️ ${movie.duration || '2h 15m'}</span>
          <span class="badge-genre">${movie.genre || 'Sci-Fi'}</span>
          <span>🌐 ${movie.language || 'English'}</span>
        </div>
        <p class="hero-desc">${movie.description || 'Experience an immersive cinematic journey filled with stunning visuals, thrilling twists, and unforgettable music.'}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="showView('watch', { id: ${movie.id} })">▶ WATCH NOW</button>
          <button class="btn btn-secondary" onclick="toggleMyList(${movie.id})">+ MY LIST</button>
          <button class="btn btn-secondary" onclick="showView('details', { id: ${movie.id} })">ⓘ Details</button>
        </div>
      </div>
    </div>
  `;
}

function renderMovieRow(containerId, movies) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (movies.length === 0) {
    container.innerHTML = `<p class="text-muted" style="padding: 1rem;">No movies available in this category.</p>`;
    return;
  }

  container.innerHTML = movies.map(movie => createMovieCardHTML(movie)).join('');
}

/**
 * 2. MOVIES CATALOGUE VIEW LOGIC
 */
async function initMoviesView(params = {}) {
  const pageTitle = document.getElementById('pageTitle');
  const searchInput = document.getElementById('catalogueSearchInput');
  const genreSelect = document.getElementById('genreFilterSelect');
  const sortSelect = document.getElementById('sortBySelect');

  if (searchInput && params.search) searchInput.value = params.search;
  if (genreSelect && params.genre) genreSelect.value = params.genre;
  if (sortSelect && params.sort) sortSelect.value = params.sort;

  try {
    let response;
    if (params.search) {
      response = await Api.searchMovies(params.search);
      if (pageTitle) pageTitle.textContent = `Search Results for "${params.search}"`;
    } else if (params.genre) {
      response = await Api.getMoviesByGenre(params.genre);
      if (pageTitle) pageTitle.textContent = `${params.genre} Movies`;
    } else {
      response = await Api.getMovies();
      if (pageTitle) pageTitle.textContent = 'Explore All Movies';
    }

    allLoadedMovies = response.data || [];
    applyCatalogueFilters();

  } catch (err) {
    console.error('Error loading catalogue:', err);
    Api.showToast('Failed to load movie library', 'error');
  }

  if (searchInput) searchInput.oninput = applyCatalogueFilters;
  if (genreSelect) genreSelect.onchange = applyCatalogueFilters;
  if (sortSelect) sortSelect.onchange = applyCatalogueFilters;
}

function applyCatalogueFilters() {
  const searchInput = document.getElementById('catalogueSearchInput');
  const genreSelect = document.getElementById('genreFilterSelect');
  const sortSelect = document.getElementById('sortBySelect');

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const genre = genreSelect ? genreSelect.value : '';
  const sort = sortSelect ? sortSelect.value : 'latest';

  let filtered = [...allLoadedMovies];

  if (query) {
    filtered = filtered.filter(m => 
      m.title.toLowerCase().includes(query) || 
      (m.genre && m.genre.toLowerCase().includes(query)) ||
      (m.language && m.language.toLowerCase().includes(query)) ||
      (m.releaseYear && m.releaseYear.toString().includes(query))
    );
  }

  if (genre) {
    filtered = filtered.filter(m => m.genre && m.genre.toLowerCase() === genre.toLowerCase());
  }

  if (sort === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'year') {
    filtered.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
  } else if (sort === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  renderCatalogueGrid(filtered);
}

function renderCatalogueGrid(movies) {
  const gridContainer = document.getElementById('moviesGrid');
  const countSpan = document.getElementById('movieCount');

  if (countSpan) countSpan.textContent = `Showing ${movies.length} movies`;
  if (!gridContainer) return;

  if (movies.length === 0) {
    gridContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎬</div>
        <h3>No movies found</h3>
        <p>Try searching for a different title or select another genre filter.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = movies.map(m => createMovieCardHTML(m)).join('');
}

/**
 * 3. MOVIE DETAILS VIEW LOGIC
 */
async function initDetailsView(params = {}) {
  currentMovieId = params.id || currentMovieId;
  if (!currentMovieId) {
    showView('movies');
    return;
  }

  try {
    const movieRes = await Api.getMovieById(currentMovieId);
    const movie = movieRes.data;

    if (!movie) {
      Api.showToast('Movie not found', 'error');
      showView('movies');
      return;
    }

    renderMovieDetails(movie);

    // Check Watchlist status if user is logged in
    const user = Api.getUser();
    if (user) {
      try {
        const checkRes = await Api.checkWatchlistStatus(currentMovieId);
        isInWatchlistState = checkRes.data === true;
        updateWatchlistButton();
      } catch (e) {}
    } else {
      isInWatchlistState = false;
      updateWatchlistButton();
    }

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
        <button class="btn btn-primary" onclick="showView('watch', { id: ${movie.id} })" style="padding: 0.9rem 2.2rem; font-size: 1.1rem;">
          ▶ WATCH NOW
        </button>
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
    showView('login');
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

/**
 * 4. WATCH VIEW LOGIC
 */
async function initWatchView(params = {}) {
  currentMovieId = params.id || currentMovieId;
  if (!currentMovieId) {
    showView('movies');
    return;
  }

  try {
    const movieRes = await Api.getMovieById(currentMovieId);
    const movie = movieRes.data;

    if (!movie) {
      Api.showToast('Movie stream not available', 'error');
      showView('movies');
      return;
    }

    renderPlayer(movie);

    const user = Api.getUser();
    if (user) {
      Api.recordWatch(currentMovieId).catch(err => console.log('Watch history record:', err));
    }

  } catch (err) {
    console.error('Error loading video stream:', err);
    Api.showToast('Could not load video player', 'error');
  }
}

function renderPlayer(movie) {
  document.title = `Watching ${movie.title} - CineVault`;

  const videoElement = document.getElementById('cineVaultVideo');
  const movieTitle = document.getElementById('watchTitle');
  const movieMeta = document.getElementById('watchMeta');
  const movieDesc = document.getElementById('watchDesc');

  if (movieTitle) movieTitle.textContent = movie.title;
  if (movieDesc) movieDesc.textContent = movie.description || 'No description provided.';
  
  if (movieMeta) {
    movieMeta.innerHTML = `
      <span class="rating-tag">⭐ ${movie.rating ? movie.rating.toFixed(1) : '8.5'}</span>
      <span class="badge-genre">${movie.genre || 'Action'}</span>
      <span>🌐 ${movie.language || 'English'}</span>
      <span>📅 ${movie.releaseYear || 2026}</span>
      <span>⏱️ ${movie.duration || '2h 15m'}</span>
    `;
  }

  if (videoElement) {
    let videoUrl = movie.videoPath;
    if (!videoUrl || videoUrl === 'undefined' || videoUrl === 'null' || videoUrl.trim() === '') {
      videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    }

    videoElement.src = videoUrl;
    videoElement.poster = movie.posterPath || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80';
    videoElement.load();
    
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.log('Autoplay policy context handling:', err);
      });
    }

    videoElement.onerror = () => {
      console.warn('Streaming fallback triggered...');
      if (videoElement.src !== 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4') {
        videoElement.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
        videoElement.load();
        videoElement.play().catch(() => {});
      }
    };
  }
}

/**
 * 5. MY LIST VIEW LOGIC
 */
async function initMyListView() {
  const user = Api.getUser();
  if (!user) {
    Api.showToast('Please login to view your Watchlist!', 'info');
    showView('login');
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

  if (countSpan) countSpan.textContent = `${movies.length} saved movies`;
  if (!grid) return;

  if (movies.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">♡</div>
        <h3>Your List is Empty</h3>
        <p>Explore movies and click "+ MY LIST" to save them here for later!</p>
        <button class="btn btn-primary" onclick="showView('movies')" style="margin-top: 1.5rem;">Explore Movies</button>
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
            <button class="btn btn-primary btn-sm" onclick="showView('watch', { id: ${movie.id} })">▶ Watch Now</button>
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
        const remaining = document.querySelectorAll('#myListGrid .movie-card');
        const countSpan = document.getElementById('myListCount');
        if (countSpan) countSpan.textContent = `${remaining.length} saved movies`;
        if (remaining.length === 0) renderWatchlist([]);
      }, 300);
    }
  } catch (err) {
    Api.showToast('Failed to remove item', 'error');
  }
}

/**
 * 6. PROFILE VIEW LOGIC
 */
async function initProfileView() {
  const user = Api.getUser();
  if (!user) {
    showView('login');
    return;
  }

  document.getElementById('profileUsername').textContent = user.username || 'User';
  document.getElementById('profileEmail').textContent = user.email || 'N/A';
  document.getElementById('profileRole').textContent = (user.role === 'ROLE_ADMIN' || user.role === 'ADMIN') ? 'Administrator' : 'Standard Member';
  document.getElementById('profileAvatar').textContent = (user.username || 'U').charAt(0).toUpperCase();

  try {
    const profileRes = await Api.getUserProfile();
    const profileData = profileRes.data;
    if (profileData) {
      document.getElementById('profileUsername').textContent = profileData.username;
      document.getElementById('profileEmail').textContent = profileData.email;
    }

    const historyRes = await Api.getWatchHistory();
    const historyList = historyRes.data || [];
    renderWatchHistory(historyList);

    const watchlistRes = await Api.getWatchlist();
    const watchlist = watchlistRes.data || [];
    document.getElementById('profileListCount').textContent = watchlist.length;

  } catch (err) {
    console.error('Failed to load profile details:', err);
  }
}

function renderWatchHistory(movies) {
  const container = document.getElementById('watchHistoryContainer');
  if (!container) return;

  if (movies.length === 0) {
    container.innerHTML = `<p class="text-muted" style="padding: 1rem 0;">No watch history yet. Start watching movies today!</p>`;
    return;
  }

  container.innerHTML = movies.map(m => `
    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-light); padding: 0.8rem 1.2rem; border-radius: var(--radius-md); margin-bottom: 0.8rem;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <img src="${m.posterPath || m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'}" style="width: 42px; height: 58px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'" />
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700;">${m.title}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${m.genre || 'Action'} • ${m.releaseYear || 2026}</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="showView('watch', { id: ${m.id} })">▶ Resume</button>
    </div>
  `).join('');
}

/**
 * 7. LOGIN VIEW LOGIC
 */
function initLoginView() {
  const user = Api.getUser();
  if (user) {
    showView((user.role === 'ROLE_ADMIN' || user.role === 'ADMIN') ? 'admin' : 'home');
  }
}

/**
 * 8. REGISTER VIEW LOGIC
 */
function initRegisterView() {
  const user = Api.getUser();
  if (user) {
    showView('home');
  }
}

/**
 * 9. ADMIN DASHBOARD VIEW LOGIC
 */
async function initAdminView() {
  const user = Api.getUser();
  if (!user || (user.role !== 'ROLE_ADMIN' && user.role !== 'ADMIN')) {
    Api.showToast('Unauthorized access. Admin privileges required.', 'error');
    showView('home');
    return;
  }

  // Bind Admin Tabs
  document.querySelectorAll('#viewAdmin .admin-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#viewAdmin .admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#viewAdmin .tab-content').forEach(c => c.style.display = 'none');

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';

      if (targetId === 'tabAddMovie' && !editingMovieId) {
        resetAddMovieForm();
      }
    };
  });

  setupFileDropzone('posterDropzone', 'posterFileInput', 'posterFileLabel');
  setupFileDropzone('videoDropzone', 'videoFileInput', 'videoFileLabel');

  await loadAdminStats();
  await loadAdminMoviesTable();
  await loadAdminUsersTable();
}

async function loadAdminStats() {
  try {
    const res = await Api.getAdminStats();
    const stats = res.data;
    if (stats) {
      document.getElementById('statTotalMovies').textContent = stats.totalMovies || 0;
      document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
      document.getElementById('statTotalViews').textContent = stats.totalViews || 0;
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

async function loadAdminMoviesTable() {
  try {
    const res = await Api.getAdminMovies();
    allAdminMovies = res.data || [];
    renderAdminMoviesTable(allAdminMovies);
  } catch (err) {
    console.error('Failed to load admin movies table:', err);
    Api.showToast('Failed to load movies list', 'error');
  }
}

function renderAdminMoviesTable(movies) {
  const tbody = document.getElementById('adminMoviesTableBody');
  if (!tbody) return;

  if (movies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;">No movies in database yet. Add your first movie!</td></tr>`;
    return;
  }

  tbody.innerHTML = movies.map(m => `
    <tr>
      <td>
        <img src="${m.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'}" class="table-thumb" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'" />
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

async function loadAdminUsersTable() {
  try {
    const res = await Api.getAdminUsers();
    const users = res.data || [];
    renderAdminUsersTable(users);
  } catch (err) {
    console.error('Failed to load users table:', err);
  }
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.email}</td>
      <td>
        <span class="tag" style="background:${u.role === 'ROLE_ADMIN' ? 'rgba(255,0,85,0.2)' : 'rgba(255,255,255,0.08)'}; color:${u.role === 'ROLE_ADMIN' ? '#ff0055' : '#cbd5e1'}">
          ${u.role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER'}
        </span>
      </td>
      <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}</td>
      <td><span style="color:#10b981; font-weight:700;">● Active</span></td>
    </tr>
  `).join('');
}

/**
 * Form Submission Event Handlers
 */
function initForms() {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('usernameOrEmail').value.trim();
      const password = document.getElementById('password').value;

      try {
        const res = await Api.login({ usernameOrEmail, password });
        Api.setToken(res.data.token);
        Api.setUser(res.data);
        Api.showToast('Login Successful! Welcome back.', 'success');

        setTimeout(() => {
          showView(res.data.role === 'ROLE_ADMIN' ? 'admin' : 'home');
        }, 500);
      } catch (err) {
        Api.showToast(err.message || 'Invalid login credentials', 'error');
      }
    };
  }

  // Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPassword = document.getElementById('regConfirmPassword').value;

      if (password !== confirmPassword) {
        Api.showToast('Passwords do not match!', 'error');
        return;
      }

      try {
        const res = await Api.register({ username, email, password });
        Api.setToken(res.data.token);
        Api.setUser(res.data);
        Api.showToast('Account created successfully! Welcome to CineVault.', 'success');

        setTimeout(() => {
          showView('home');
        }, 500);
      } catch (err) {
        Api.showToast(err.message || 'Registration failed', 'error');
      }
    };
  }

  // Add/Edit Movie Form
  const addMovieForm = document.getElementById('addMovieForm');
  if (addMovieForm) {
    addMovieForm.onsubmit = async (e) => {
      e.preventDefault();

      const submitBtn = addMovieForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading & Saving...';

      const formData = new FormData(addMovieForm);

      try {
        if (editingMovieId) {
          await Api.updateMovie(editingMovieId, formData);
          Api.showToast('Movie updated successfully! ✨', 'success');
        } else {
          await Api.addMovie(formData);
          Api.showToast('New Movie uploaded and published! 🚀', 'success');
        }

        resetAddMovieForm();
        await loadAdminStats();
        await loadAdminMoviesTable();

        const moviesTab = document.querySelector('#viewAdmin [data-tab="tabMovies"]');
        if (moviesTab) moviesTab.click();

      } catch (err) {
        Api.showToast(err.message || 'Movie operation failed', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingMovieId ? 'UPDATE MOVIE' : 'ADD MOVIE';
      }
    };
  }
}

/**
 * File Upload Dropzone Setup
 */
function setupFileDropzone(dropzoneId, inputId, labelId) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!input || !label || !dropzone) return;

  dropzone.onclick = (e) => {
    if (e.target !== input) {
      input.click();
    }
  };

  input.onclick = (e) => {
    e.stopPropagation();
  };

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

  input.onchange = () => updateFileLabel(input, label);
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

  const formTab = document.querySelector('#viewAdmin [data-tab="tabAddMovie"]');
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
    await loadAdminStats();
    await loadAdminMoviesTable();
  } catch (err) {
    Api.showToast('Failed to delete movie', 'error');
  }
}

/**
 * Universal Movie Card Generator Component
 */
function createMovieCardHTML(movie) {
  const posterUrl = movie.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';
  const rating = movie.rating ? movie.rating.toFixed(1) : '8.0';

  return `
    <div class="movie-card" onclick="showView('details', { id: ${movie.id} })">
      <div class="poster-wrapper">
        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'" />
        <div class="card-overlay">
          <div class="overlay-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); showView('watch', { id: ${movie.id} })">▶ Watch Now</button>
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
    showView('login');
    return;
  }

  try {
    await Api.addToWatchlist(movieId);
    Api.showToast('Added to My List! ❤️', 'success');
  } catch (err) {
    Api.showToast(err.message || 'Already in My List!', 'info');
  }
}
