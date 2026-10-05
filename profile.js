/**
 * CineVault - Profile Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

async function initProfilePage() {
  const user = Api.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Populate basic profile UI
  document.getElementById('profileUsername').textContent = user.username || 'User';
  document.getElementById('profileEmail').textContent = user.email || 'N/A';
  document.getElementById('profileRole').textContent = user.role === 'ROLE_ADMIN' ? 'Administrator' : 'Standard Member';
  document.getElementById('profileAvatar').textContent = (user.username || 'U').charAt(0).toUpperCase();

  try {
    // 1. Fetch Profile Details from server
    const profileRes = await Api.getUserProfile();
    const profileData = profileRes.data;
    if (profileData) {
      document.getElementById('profileUsername').textContent = profileData.username;
      document.getElementById('profileEmail').textContent = profileData.email;
    }

    // 2. Fetch Watch History
    const historyRes = await Api.getWatchHistory();
    const historyList = historyRes.data || [];
    renderWatchHistory(historyList);

    // 3. Fetch Watchlist Count
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
        <img src="${m.posterPath || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'}" style="width: 42px; height: 58px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80'" />
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700;">${m.title}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${m.genre || 'Action'} • ${m.releaseYear || 2026}</span>
        </div>
      </div>
      <a href="/watch.html?id=${m.id}" class="btn btn-secondary btn-sm">▶ Resume</a>
    </div>
  `).join('');
}
