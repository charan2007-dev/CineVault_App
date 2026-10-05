/**
 * ============================================================
 * CineVault - Watch Page Controller & Netflix Player Handler
 * ============================================================
 *
 * Responsibilities:
 * 1. Get movie ID from URL
 * 2. Load movie details from backend API
 * 3. Display movie title, metadata, and description
 * 4. Load movie video stream or fallback demo video
 * 5. Set movie poster inside video player
 * 6. Set movie poster as dynamic cinematic backdrop CSS variable & background
 * 7. Record watch history for authenticated users
 * 8. Handle video error fallback gracefully
 * ============================================================
 */

/* ============================================================
   PAGE LOAD
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initWatchPage();
});

/* ============================================================
   INITIALIZE WATCH PAGE
   ============================================================ */

async function initWatchPage() {
    // Get movie ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    // If movie ID is missing, go back to movies page
    if (!movieId) {
        window.location.href = '/movies.html';
        return;
    }

    try {
        // Get movie information from backend API
        const movieRes = await Api.getMovieById(movieId);
        const movie = movieRes ? movieRes.data : null;

        // Check whether movie exists
        if (!movie) {
            Api.showToast('Movie not available for streaming', 'error');
            setTimeout(() => {
                window.location.href = '/movies.html';
            }, 1500);
            return;
        }

        // Render movie player, backdrop, and details
        renderPlayer(movie);

        // Record watch history for logged-in user
        const user = Api.getUser();
        if (user) {
            Api.recordWatch(movieId).catch(err => {
                console.log('Watch history record error:', err);
            });
        }
    } catch (err) {
        console.error('Error loading movie stream:', err);
        Api.showToast('Could not load video player', 'error');
    }
}

/* ============================================================
   RENDER PLAYER & BACKDROP
   ============================================================ */

function renderPlayer(movie) {
    // Set Document Title
    document.title = `Watching ${movie.title} - CineVault`;

    // HTML Elements
    const videoElement = document.getElementById('cineVaultVideo');
    const movieTitle = document.getElementById('watchTitle');
    const movieMeta = document.getElementById('watchMeta');
    const movieDesc = document.getElementById('watchDesc');

    // Render Movie Title
    if (movieTitle) {
        movieTitle.textContent = movie.title;
    }

    // Render Movie Description
    if (movieDesc) {
        movieDesc.textContent = movie.description || 'No description provided for this movie.';
    }

    // Render Movie Metadata
    if (movieMeta) {
        const ratingVal = movie.rating ? Number(movie.rating).toFixed(1) : '8.5';
        const genreVal = movie.genre || 'Action';
        const langVal = movie.language || 'English';
        const yearVal = movie.releaseYear || 2026;
        const durationVal = movie.duration || '2h 15m';

        movieMeta.innerHTML = `
            <span class="meta-rating">
                ⭐ ${ratingVal}
            </span>
            <span class="badge-genre">
                ${genreVal}
            </span>
            <span class="meta-item">
                🌐 ${langVal}
            </span>
            <span class="meta-item">
                📅 ${yearVal}
            </span>
            <span class="meta-item">
                ⏱️ ${durationVal}
            </span>
        `;
    }

    if (!videoElement) {
        console.error('Video element #cineVaultVideo was not found.');
        return;
    }

    // Video URL & Fallback
    let videoUrl = movie.videoPath;
    const fallbackVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

    if (!videoUrl || videoUrl === 'undefined' || videoUrl === 'null' || videoUrl.trim() === '') {
        videoUrl = fallbackVideo;
    }

    // Poster URL
    const posterUrl = (movie.posterPath && movie.posterPath !== 'undefined' && movie.posterPath !== 'null' && movie.posterPath.trim() !== '')
        ? movie.posterPath
        : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80';

    // Set Video Source and Poster
    videoElement.src = videoUrl;
    videoElement.poster = posterUrl;

    // Dynamically Set Poster as Watch-Page Backdrop CSS Variable & inline element styling
    document.documentElement.style.setProperty('--watch-poster', `url("${posterUrl}")`);
    if (document.body) {
        document.body.style.setProperty('--watch-poster', `url("${posterUrl}")`);
    }

    const backdropEl = document.getElementById('watchBackdrop');
    if (backdropEl) {
        backdropEl.style.backgroundImage = `url("${posterUrl}")`;
    }

    // Load Video
    videoElement.load();

    // Autoplay
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.log('Autoplay prevented by browser context policy:', err);
        });
    }

    // Video Stream Error Handling (Fallback to TearsOfSteel sample)
    videoElement.onerror = () => {
        console.warn('Video failed to stream, loading fallback trailer stream...');
        if (videoElement.src !== fallbackVideo) {
            videoElement.src = fallbackVideo;
            videoElement.load();
            videoElement.play().catch(() => {});
        }
    };
}
