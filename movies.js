/**
 * CineVault - Movies Catalogue Controller
 */

let allLoadedMovies = [];

document.addEventListener('DOMContentLoaded', () => {
  initMoviesPage();
});

async function initMoviesPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  const genreParam = urlParams.get('genre');

  const pageTitle = document.getElementById('pageTitle');
  const searchInput = document.getElementById('catalogueSearchInput');
  const genreSelect = document.getElementById('genreFilterSelect');

  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }

  if (genreSelect && genreParam) {
    genreSelect.value = genreParam;
  }

  try {
    let response;
    if (searchQuery) {
      response = await Api.searchMovies(searchQuery);
      if (pageTitle) pageTitle.textContent = `Search Results for "${searchQuery}"`;
    } else if (genreParam) {
      response = await Api.getMoviesByGenre(genreParam);
      if (pageTitle) pageTitle.textContent = `${genreParam} Movies`;
    } else {
      response = await Api.getMovies();
      if (pageTitle) pageTitle.textContent = 'Explore All Movies';
    }

    allLoadedMovies = response.data || [];
    renderCatalogueGrid(allLoadedMovies);

  } catch (err) {
    console.error('Error loading catalogue:', err);
    Api.showToast('Failed to load movie library', 'error');
  }

  // Bind live search & filter events
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  if (genreSelect) {
    genreSelect.addEventListener('change', applyFilters);
  }
  const sortSelect = document.getElementById('sortBySelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }
}

function applyFilters() {
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
    // default ID desc
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  renderCatalogueGrid(filtered);
}

function renderCatalogueGrid(movies) {
  const gridContainer = document.getElementById('moviesGrid');
  const countSpan = document.getElementById('movieCount');

  if (countSpan) {
    countSpan.textContent = `Showing ${movies.length} movies`;
  }

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
