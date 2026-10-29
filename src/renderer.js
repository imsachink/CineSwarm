// TorrentStream - Modern Frontend Controller
// Implements Netflix-grade Home Catalog with Spotlight Carousel,
// Recently Watched / Continue Watching with Timestamp Resume,
// Dual CDN + P2P Torrent Streaming, and Docked Mini-Player with Pause-on-Minimize.

let activeStreamUrl = null;
let currentMovieTitle = '';
let currentMovieData = null;
let currentSearchResults = { titles: [], torrents: [] };
let activePlayerMode = 'web'; // 'web' | 'torrent'
let activeSeriesData = null;
let currentSelectedSeason = 1;
let isPlaybackActive = false;
let isDockedPaused = false;
let pausedIframeSrc = null;
let pendingResumeTime = null;

// Multi-file / Season Pack State
let currentTorrentEpisodes = [];
let activeTorrentFileIndex = null;
let activeTorrentData = null;

// Spotlight Carousel State
let heroList = [];
let heroIndex = 0;
let heroTimer = null;

// DOM Elements - Views
const homeView = document.getElementById('homeView');
const resultsView = document.getElementById('resultsView');
const playerView = document.getElementById('playerView');

// Header & Search Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const btnBackHome = document.getElementById('btnBackHome');

// Hero Showcase & Carousel Elements
const heroShowcase = document.getElementById('heroShowcase');
const heroBackdrop = document.getElementById('heroBackdrop');
const heroRating = document.getElementById('heroRating');
const heroYear = document.getElementById('heroYear');
const heroGenres = document.getElementById('heroGenres');
const heroType = document.getElementById('heroType');
const heroTitle = document.getElementById('heroTitle');
const heroOverview = document.getElementById('heroOverview');
const btnHeroStreamFast = document.getElementById('btnHeroStreamFast');
const btnHeroTorrent = document.getElementById('btnHeroTorrent');
const heroPosterCard = document.getElementById('heroPosterCard');
const heroPosterImg = document.getElementById('heroPosterImg');
const heroPosterQuality = document.getElementById('heroPosterQuality');
const btnHeroPrev = document.getElementById('btnHeroPrev');
const btnHeroNext = document.getElementById('btnHeroNext');
const heroDots = document.getElementById('heroDots');

// Home Category Sections & Grids
const sectionRecent = document.getElementById('sectionRecent');
const recentGrid = document.getElementById('recentGrid');
const btnClearRecent = document.getElementById('btnClearRecent');
const chipRecent = document.getElementById('chipRecent');

const sectionTrendingMovies = document.getElementById('sectionTrendingMovies');
const sectionTrendingSeries = document.getElementById('sectionTrendingSeries');
const sectionClassics = document.getElementById('sectionClassics');
const trendingMoviesGrid = document.getElementById('trendingMoviesGrid');
const trendingSeriesGrid = document.getElementById('trendingSeriesGrid');
const classicsGrid = document.getElementById('classicsGrid');
const catChips = document.querySelectorAll('.cat-chip');

// Search Results Elements
const resultsCount = document.getElementById('resultsCount');
const tabFastWeb = document.getElementById('tabFastWeb');
const tabTorrents = document.getElementById('tabTorrents');
const badgeFastCount = document.getElementById('badgeFastCount');
const badgeTorrentCount = document.getElementById('badgeTorrentCount');
const cdnNoticeBanner = document.getElementById('cdnNoticeBanner');
const panelFastWeb = document.getElementById('panelFastWeb');
const panelTorrents = document.getElementById('panelTorrents');

// Player View Elements
const btnBackToResults = document.getElementById('btnBackToResults');
const playerMovieTitle = document.getElementById('playerMovieTitle');
const webPlayerFrame = document.getElementById('webPlayerFrame');
const videoPlayer = document.getElementById('videoPlayer');
const webServerControls = document.getElementById('webServerControls');
const torrentControls = document.getElementById('torrentControls');
const serverSelect = document.getElementById('serverSelect');
const btnSwitchToTorrent = document.getElementById('btnSwitchToTorrent');
const btnSwitchToFast = document.getElementById('btnSwitchToFast');
const btnOpenVLC = document.getElementById('btnOpenVLC');

// Mini-Player Dock Elements
const miniPlayerBar = document.getElementById('miniPlayerBar');
const miniPlayerClickable = document.getElementById('miniPlayerClickable');
const miniStatusBadge = document.getElementById('miniStatusBadge');
const miniTitle = document.getElementById('miniTitle');
const miniSub = document.getElementById('miniSub');
const btnMiniTogglePlay = document.getElementById('btnMiniTogglePlay');
const btnMiniExpand = document.getElementById('btnMiniExpand');
const btnMiniClose = document.getElementById('btnMiniClose');

// Torrent Episode Controls
const torrentEpisodeControls = document.getElementById('torrentEpisodeControls');
const torrentEpisodeSelect = document.getElementById('torrentEpisodeSelect');
const btnTorrentPrevEp = document.getElementById('btnTorrentPrevEp');
const btnTorrentNextEp = document.getElementById('btnTorrentNextEp');
const torrentPlaylistBar = document.getElementById('torrentPlaylistBar');
const torrentPlaylistCount = document.getElementById('torrentPlaylistCount');
const torrentPlaylistGrid = document.getElementById('torrentPlaylistGrid');

// Buffering Overlay & HUD Elements
const bufferingOverlay = document.getElementById('bufferingOverlay');
const overlayStatus = document.getElementById('overlayStatus');
const overlaySubtext = document.getElementById('overlaySubtext');

const torrentHud = document.getElementById('torrentHud');
const hudSpeed = document.getElementById('hudSpeed');
const hudPeers = document.getElementById('hudPeers');
const hudProgress = document.getElementById('hudProgress');
const hudSize = document.getElementById('hudSize');

// TV Series Modal Elements
const seriesModal = document.getElementById('seriesModal');
const seriesModalTitle = document.getElementById('seriesModalTitle');
const btnCloseModal = document.getElementById('btnCloseModal');
const seasonSelectorBar = document.getElementById('seasonSelectorBar');
const episodesList = document.getElementById('episodesList');

// Format Speed Helper
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const k = 1024;
  if (bytesPerSec < k * k) {
    return (bytesPerSec / k).toFixed(1) + ' KB/s';
  }
  return (bytesPerSec / (k * k)).toFixed(1) + ' MB/s';
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------- VIEW ROUTING ----------------
function switchView(viewName) {
  homeView.classList.remove('active');
  resultsView.classList.remove('active');
  playerView.classList.remove('active');

  if (viewName === 'home') {
    homeView.classList.add('active');
    renderRecentWatched();
  } else if (viewName === 'results') {
    resultsView.classList.add('active');
  } else if (viewName === 'player') {
    playerView.classList.add('active');
    miniPlayerBar.classList.remove('active');
  }
}

// ========================================================
// RECENTLY WATCHED / CONTINUE WATCHING MANAGER
// ========================================================
const RECENT_STORAGE_KEY = 'torrentstream_recent_watched';

function getRecentWatched() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentPlayback(item) {
  if (!item || !item.title) return;
  const list = getRecentWatched().filter(x => x.id !== item.id);

  list.unshift({
    id: item.id || item.imdbId || item.title,
    title: item.title,
    type: item.type || 'movie',
    poster: item.poster || '',
    background: item.background || item.poster || '',
    currentTime: Math.floor(item.currentTime || 0),
    duration: Math.floor(item.duration || 0),
    progressPct: item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0,
    mode: item.mode || activePlayerMode,
    imdbId: item.imdbId || null,
    season: item.season || null,
    episode: item.episode || null,
    webServers: item.webServers || null,
    magnet: item.magnet || null,
    fileIndex: item.fileIndex || null,
    sizeStr: item.sizeStr || '-',
    updatedAt: Date.now()
  });

  // Limit to 12 recent items
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
  renderRecentWatched();
}

function removeRecentItem(id) {
  const list = getRecentWatched().filter(x => x.id !== id);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(list));
  renderRecentWatched();
}

function renderRecentWatched() {
  const list = getRecentWatched();
  if (!list || list.length === 0) {
    sectionRecent.style.display = 'none';
    if (chipRecent) chipRecent.style.display = 'none';
    return;
  }

  sectionRecent.style.display = 'block';
  if (chipRecent) chipRecent.style.display = 'inline-flex';
  recentGrid.innerHTML = '';

  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'recent-card';

    const thumbUrl = item.background || item.poster || 'https://images.metahub.space/background/small/fallback/img';
    const timeLabel = item.currentTime > 0 ? `Resume at ${formatTime(item.currentTime)}` : 'Watch from start';
    const isSeries = item.type === 'series' || (item.season && item.episode);
    const badgeText = isSeries ? `📺 S${item.season || 1}E${item.episode || 1}` : (item.mode === 'torrent' ? '⚡ P2P' : '🎬 Movie');

    card.innerHTML = `
      <div class="recent-thumb-wrap">
        <img class="recent-thumb-img" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.title)}" onerror="this.src='https://via.placeholder.com/320x180/111827/475569?text=Stream'" />
        <span class="recent-badge">${badgeText}</span>
        <button class="btn-remove-recent" title="Remove from Continue Watching">&times;</button>
        <div class="recent-play-hover">
          <div class="recent-play-icon">▶</div>
        </div>
        <div class="recent-progress-bar">
          <div class="recent-progress-fill" style="width: ${item.progressPct || 5}%;"></div>
        </div>
      </div>
      <div class="recent-info">
        <div class="recent-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="recent-sub">
          <span class="recent-resume-hint">${timeLabel}</span>
          <span>${item.progressPct > 0 ? `${item.progressPct}%` : 'Recently played'}</span>
        </div>
      </div>
    `;

    // Remove single item
    card.querySelector('.btn-remove-recent').addEventListener('click', (e) => {
      e.stopPropagation();
      removeRecentItem(item.id);
    });

    // Resume Playback
    card.addEventListener('click', () => {
      resumeRecentPlayback(item);
    });

    recentGrid.appendChild(card);
  });
}

function resumeRecentPlayback(item) {
  pendingResumeTime = item.currentTime > 0 ? item.currentTime : null;

  if (item.mode === 'torrent' && item.magnet) {
    startTorrentStream({
      magnet: item.magnet,
      title: item.title,
      sizeStr: item.sizeStr,
      season: item.season,
      episode: item.episode,
      fileIndex: item.fileIndex
    });
  } else if (item.webServers && item.webServers.length > 0) {
    playFastWebStream(item);
  } else if (item.imdbId) {
    // Generate web servers and play
    const servers = [
      { name: 'Server 1 (VidSrc Pro)', url: `https://vidsrc.me/embed/${item.type === 'series' ? 'tv' : 'movie'}?imdb=${item.imdbId}${item.season ? `&season=${item.season}&episode=${item.episode}` : ''}` },
      { name: 'Server 2 (AutoEmbed)', url: `https://autoembed.to/${item.type === 'series' ? 'tv' : 'movie'}/imdb/${item.imdbId}${item.season ? `-${item.season}-${item.episode}` : ''}` }
    ];
    playFastWebStream({ ...item, webServers: servers });
  } else {
    // Fallback: search title
    searchInput.value = item.title;
    performSearch();
  }
}

if (btnClearRecent) {
  btnClearRecent.addEventListener('click', () => {
    if (confirm('Clear all items from your Continue Watching history?')) {
      localStorage.removeItem(RECENT_STORAGE_KEY);
      renderRecentWatched();
    }
  });
}

// ---------------- RICH HOME CATALOG & SPOTLIGHT CAROUSEL ----------------
async function loadHomeFeed() {
  try {
    const catalog = await window.api.getHomeCatalog();

    // 1. Setup Spotlight Carousel
    heroList = catalog.heroList && catalog.heroList.length > 0 ? catalog.heroList : (catalog.hero ? [catalog.hero] : []);
    if (heroList.length > 0) {
      setupHeroCarousel(heroList);
    }

    // 2. Render Continue Watching
    renderRecentWatched();

    // 3. Render Trending Movies
    renderHomeCards(trendingMoviesGrid, catalog.trendingMovies || [], 'movie');

    // 4. Render Trending TV Series
    renderHomeCards(trendingSeriesGrid, catalog.trendingSeries || [], 'series');

    // 5. Render Instant Classics
    renderClassics(classicsGrid, catalog.classics || []);

  } catch (err) {
    console.error('Failed to load home feed:', err);
    trendingMoviesGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--text-secondary);">
        Unable to load trending catalog. Use the search bar above to stream any title.
      </div>
    `;
  }
}

function setupHeroCarousel(items) {
  heroList = items;
  heroIndex = 0;

  // Build Dots
  heroDots.innerHTML = '';
  heroList.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = `hero-dot ${idx === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => {
      heroIndex = idx;
      displayHeroItem(heroIndex);
      resetHeroTimer();
    });
    heroDots.appendChild(dot);
  });

  displayHeroItem(0);
  startHeroTimer();

  // Navigation Arrows
  btnHeroNext.onclick = () => {
    heroIndex = (heroIndex + 1) % heroList.length;
    displayHeroItem(heroIndex);
    resetHeroTimer();
  };

  btnHeroPrev.onclick = () => {
    heroIndex = (heroIndex - 1 + heroList.length) % heroList.length;
    displayHeroItem(heroIndex);
    resetHeroTimer();
  };

  // Pause carousel on hover
  heroShowcase.addEventListener('mouseenter', () => clearInterval(heroTimer));
  heroShowcase.addEventListener('mouseleave', () => startHeroTimer());
}

function startHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    if (heroList.length > 1) {
      heroIndex = (heroIndex + 1) % heroList.length;
      displayHeroItem(heroIndex);
    }
  }, 8500);
}

function resetHeroTimer() {
  startHeroTimer();
}

function displayHeroItem(index) {
  const item = heroList[index];
  if (!item) return;

  // Fade out backdrop briefly for smooth transition
  heroBackdrop.style.opacity = '0.3';
  setTimeout(() => {
    heroBackdrop.src = item.background || item.poster || 'https://images.metahub.space/background/small/fallback/img';
    heroBackdrop.style.opacity = '1';
  }, 180);

  // Update Poster Card
  if (heroPosterImg) {
    heroPosterImg.src = item.poster || item.background || 'https://images.metahub.space/poster/small/fallback/img';
  }

  heroTitle.textContent = item.title;
  heroOverview.textContent = item.description || 'Watch now in high definition with instant 1-sec CDN stream or decentralized P2P torrent swarm.';
  heroRating.textContent = `★ ${item.rating || '8.8'}`;
  heroYear.textContent = item.year || '2026';
  heroType.textContent = item.type === 'series' ? '📺 TV Series' : '🎬 Blockbuster';

  if (heroGenres && item.genres && item.genres.length > 0) {
    heroGenres.textContent = item.genres.slice(0, 2).join(' • ');
    heroGenres.style.display = 'inline-flex';
  } else if (heroGenres) {
    heroGenres.style.display = 'none';
  }

  // Action Buttons
  const playAction = () => {
    if (item.type === 'series') {
      openSeriesModal(item);
    } else {
      playFastWebStream(item);
    }
  };

  btnHeroStreamFast.onclick = playAction;
  if (heroPosterCard) heroPosterCard.onclick = playAction;

  btnHeroTorrent.onclick = () => {
    searchInput.value = `${item.title} ${item.year || ''}`.trim();
    performSearch();
  };

  // Update Dots
  const dots = heroDots.querySelectorAll('.hero-dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === index);
  });
}

function renderHomeCards(container, items, type) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--text-secondary);">
        No titles currently available in this section.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const isSeries = type === 'series' || item.type === 'series';
    const tagClass = isSeries ? 'type-tag series' : 'type-tag movie';
    const tagLabel = isSeries ? '📺 Series' : '🎬 Movie';

    const posterUrl = item.poster && item.poster.startsWith('http')
      ? item.poster
      : 'https://images.metahub.space/poster/small/fallback/img';

    card.innerHTML = `
      <div class="movie-poster-wrap">
        <img class="movie-poster" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/161b22/8b949e?text=No+Poster'" />
        <span class="${tagClass}">${tagLabel}</span>
        ${item.rating ? `<span class="rating-badge" style="position: absolute; bottom: 8px; left: 8px;">★ ${escapeHtml(item.rating)}</span>` : ''}
      </div>
      <div class="movie-info">
        <div>
          <div class="movie-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          <div class="movie-year">${escapeHtml(item.year || '')}</div>
        </div>
        ${isSeries
          ? `<button class="btn-browse-series">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
              Browse Episodes
            </button>`
          : `<button class="btn-stream-fast">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              ▶ Stream Fast
            </button>`
        }
      </div>
    `;

    if (isSeries) {
      card.querySelector('.btn-browse-series').addEventListener('click', () => {
        openSeriesModal(item);
      });
    } else {
      card.querySelector('.btn-stream-fast').addEventListener('click', () => {
        playFastWebStream(item);
      });
    }

    container.appendChild(card);
  });
}

function renderClassics(container, items) {
  if (!items || items.length === 0) return;
  container.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    card.innerHTML = `
      <div class="movie-poster-wrap" style="aspect-ratio: 16/9; background: #131926; display: flex; align-items: center; justify-content: center; position: relative;">
        <div style="font-size: 2.2rem;">🎬</div>
        <span class="type-tag movie" style="background: rgba(34, 197, 94, 0.85); color: #fff;">⚡ Instant P2P</span>
        <span class="badge badge-size" style="position: absolute; bottom: 8px; right: 8px;">${escapeHtml(item.sizeFormatted)}</span>
      </div>
      <div class="movie-info">
        <div>
          <div class="movie-title">${escapeHtml(item.title)}</div>
          <div class="movie-year">${escapeHtml(item.description)}</div>
        </div>
        <button class="btn-stream-fast" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          ⚡ Stream P2P
        </button>
      </div>
    `;

    card.querySelector('button').addEventListener('click', () => {
      startTorrentStream({
        magnet: item.magnet,
        title: item.title,
        sizeStr: item.sizeFormatted
      });
    });

    container.appendChild(card);
  });
}

// Category Filter Pills Handler
catChips.forEach(chip => {
  chip.addEventListener('click', () => {
    catChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const filter = chip.getAttribute('data-filter');
    const hasRecent = getRecentWatched().length > 0;

    if (filter === 'all') {
      if (hasRecent) sectionRecent.style.display = 'block';
      sectionTrendingMovies.style.display = 'block';
      sectionTrendingSeries.style.display = 'block';
      sectionClassics.style.display = 'block';
    } else if (filter === 'recent') {
      sectionRecent.style.display = 'block';
      sectionTrendingMovies.style.display = 'none';
      sectionTrendingSeries.style.display = 'none';
      sectionClassics.style.display = 'none';
    } else if (filter === 'movies') {
      sectionRecent.style.display = 'none';
      sectionTrendingMovies.style.display = 'block';
      sectionTrendingSeries.style.display = 'none';
      sectionClassics.style.display = 'none';
    } else if (filter === 'series') {
      sectionRecent.style.display = 'none';
      sectionTrendingMovies.style.display = 'none';
      sectionTrendingSeries.style.display = 'block';
      sectionClassics.style.display = 'none';
    } else if (filter === 'classics') {
      sectionRecent.style.display = 'none';
      sectionTrendingMovies.style.display = 'none';
      sectionTrendingSeries.style.display = 'none';
      sectionClassics.style.display = 'block';
    }
  });
});

// ---------------- SEARCH LOGIC ----------------
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  switchView('results');
  resultsCount.textContent = `Searching CDN nodes & decentralized swarms for "${query}"...`;
  cdnNoticeBanner.style.display = 'none';

  panelFastWeb.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--text-secondary);">
      <div class="spinner" style="margin: 0 auto 18px;"></div>
      Querying movies, TV series, CDN streams, and torrent swarms...
    </div>
  `;
  panelTorrents.innerHTML = '';

  try {
    const data = await window.api.searchMovies(query);
    currentSearchResults = data || { titles: [], torrents: [] };

    const titleCount = currentSearchResults.titles.length;
    const torrentCount = currentSearchResults.torrents.length;

    badgeFastCount.textContent = titleCount;
    badgeTorrentCount.textContent = torrentCount;

    resultsCount.textContent = `Found ${titleCount} streaming title(s) and ${torrentCount} P2P torrent(s)`;

    renderTitlesGrid();
    renderTorrentList();

    if (titleCount === 0 && torrentCount > 0) {
      showTab('torrent');
      cdnNoticeBanner.style.display = 'flex';
    } else {
      showTab('web');
      cdnNoticeBanner.style.display = 'none';
    }
  } catch (err) {
    resultsCount.textContent = 'Search failed';
    panelFastWeb.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--danger);">
        Error fetching search results: ${escapeHtml(err.message || 'Network error')}
      </div>
    `;
  }
}

// Search View Tab Switcher
function showTab(tabName) {
  if (tabName === 'web') {
    tabFastWeb.classList.add('active');
    tabTorrents.classList.remove('active');
    panelFastWeb.style.display = 'grid';
    panelTorrents.style.display = 'none';
  } else {
    tabFastWeb.classList.remove('active');
    tabTorrents.classList.add('active');
    panelFastWeb.style.display = 'none';
    panelTorrents.style.display = 'flex';
  }
}

tabFastWeb.addEventListener('click', () => showTab('web'));
tabTorrents.addEventListener('click', () => showTab('torrent'));

function renderTitlesGrid() {
  const titles = currentSearchResults.titles;
  if (!titles || titles.length === 0) {
    panelFastWeb.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">
        No CDN titles found. Click the <strong>"P2P Torrent Swarms"</strong> tab above to stream from decentralized torrent swarms.
      </div>
    `;
    return;
  }

  panelFastWeb.innerHTML = '';
  titles.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const isSeries = item.type === 'series';
    const tagClass = isSeries ? 'type-tag series' : 'type-tag movie';
    const tagLabel = isSeries ? '📺 TV Series' : '🎬 Movie';

    const posterUrl = item.poster && item.poster.startsWith('http')
      ? item.poster
      : 'https://images.metahub.space/poster/small/fallback/img';

    card.innerHTML = `
      <div class="movie-poster-wrap">
        <img class="movie-poster" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/161b22/8b949e?text=No+Poster'" />
        <span class="${tagClass}">${tagLabel}</span>
      </div>
      <div class="movie-info">
        <div>
          <div class="movie-title">${escapeHtml(item.title)}</div>
          <div class="movie-year">${escapeHtml(item.year || '')}</div>
        </div>
        ${isSeries
          ? `<button class="btn-browse-series">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
              Browse Episodes
            </button>`
          : `<button class="btn-stream-fast">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              ⚡ Play Instantly (1-Sec)
            </button>`
        }
      </div>
    `;

    if (isSeries) {
      card.querySelector('.btn-browse-series').addEventListener('click', () => {
        openSeriesModal(item);
      });
    } else {
      card.querySelector('.btn-stream-fast').addEventListener('click', () => {
        playFastWebStream(item);
      });
    }

    panelFastWeb.appendChild(card);
  });
}

function renderTorrentList() {
  const torrents = currentSearchResults.torrents;
  if (!torrents || torrents.length === 0) {
    panelTorrents.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
        No torrent swarms found for this query.
      </div>
    `;
    return;
  }

  panelTorrents.innerHTML = '';
  torrents.forEach((torrent, index) => {
    const item = document.createElement('div');
    item.className = 'torrent-item';

    let seedLabel = '';
    let seedBadgeClass = 'badge badge-seeds';

    if (torrent.seeds >= 40) {
      seedLabel = `⚡ Ultra Fast (${torrent.seeds} seeds)`;
    } else if (torrent.seeds >= 15) {
      seedLabel = `🟢 High Speed (${torrent.seeds} seeds)`;
    } else if (torrent.seeds >= 5) {
      seedLabel = `🟡 Medium (${torrent.seeds} seeds)`;
    } else {
      seedLabel = `🔴 Slow (${torrent.seeds} seeds)`;
      seedBadgeClass = 'badge badge-seeds low';
    }

    const isTopPick = index === 0 && torrent.seeds >= 20;
    const isSeasonPack = /(season|\bs\d+\b|complete)/i.test(torrent.title);

    item.innerHTML = `
      <div class="torrent-info">
        <div class="torrent-name" title="${escapeHtml(torrent.title)}">
          ${isTopPick ? '<span style="color: var(--accent-orange); font-size: 0.85rem; font-weight: 700;">★ TOP PICK: </span>' : ''}
          ${escapeHtml(torrent.title)}
        </div>
        <div class="card-meta">
          <span class="${seedBadgeClass}">${seedLabel}</span>
          ${isSeasonPack ? '<span class="badge badge-quality" style="border-color: rgba(168, 85, 247, 0.4); color: var(--accent-purple);">📦 Season Pack (All Episodes)</span>' : ''}
          <span class="badge badge-size">${escapeHtml(torrent.sizeFormatted)}</span>
          <span class="badge badge-quality">${escapeHtml(torrent.source)}</span>
        </div>
      </div>
      <button class="btn-search" style="padding: 8px 16px; white-space: nowrap; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Stream via P2P
      </button>
    `;

    item.querySelector('button').addEventListener('click', () => {
      startTorrentStream({ magnet: torrent.magnet, title: torrent.title, sizeStr: torrent.sizeFormatted });
    });

    panelTorrents.appendChild(item);
  });
}

// ---------------- TV SERIES MODAL / EPISODE SELECTOR (CDN) ----------------
async function openSeriesModal(seriesItem) {
  activeSeriesData = seriesItem;
  seriesModalTitle.textContent = `${seriesItem.title} - Select Episode`;
  seasonSelectorBar.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">Loading episodes...</span>';
  episodesList.innerHTML = '<div class="spinner" style="margin: 30px auto;"></div>';
  seriesModal.style.display = 'flex';

  try {
    const data = await window.api.getSeriesEpisodes(seriesItem.imdbId);
    activeSeriesData.seasons = data.seasons || {};

    const seasonKeys = Object.keys(activeSeriesData.seasons).filter(k => k !== '0');
    if (seasonKeys.length === 0 && activeSeriesData.seasons['0']) {
      seasonKeys.push('0');
    }

    if (seasonKeys.length === 0) {
      seasonSelectorBar.innerHTML = '';
      episodesList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No episode data available for this show.</div>';
      return;
    }

    currentSelectedSeason = seasonKeys.includes('1') ? 1 : parseInt(seasonKeys[0], 10);
    renderSeasonChips(seasonKeys);
    renderEpisodes(currentSelectedSeason);
  } catch (err) {
    episodesList.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load episodes: ${escapeHtml(err.message)}</div>`;
  }
}

function renderSeasonChips(seasonKeys) {
  seasonSelectorBar.innerHTML = '';
  seasonKeys.forEach(sNum => {
    const chip = document.createElement('button');
    chip.className = `season-chip ${parseInt(sNum, 10) === currentSelectedSeason ? 'active' : ''}`;
    chip.textContent = sNum === '0' ? 'Specials' : `Season ${sNum}`;
    chip.addEventListener('click', () => {
      currentSelectedSeason = parseInt(sNum, 10);
      document.querySelectorAll('.season-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderEpisodes(currentSelectedSeason);
    });
    seasonSelectorBar.appendChild(chip);
  });
}

function renderEpisodes(seasonNumber) {
  const episodes = activeSeriesData.seasons[seasonNumber] || [];
  if (episodes.length === 0) {
    episodesList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No episodes in this season.</div>';
    return;
  }

  episodesList.innerHTML = '';
  episodes.forEach(ep => {
    const row = document.createElement('div');
    row.className = 'episode-row';

    row.innerHTML = `
      <div class="episode-info">
        <div class="episode-name">Episode ${ep.episode}: ${escapeHtml(ep.title)}</div>
        <div class="episode-desc">${escapeHtml(ep.overview || 'No description available.')}</div>
      </div>
      <div class="episode-actions">
        <button class="btn-stream-fast" style="padding: 8px 14px; font-size: 0.8rem;">
          ⚡ Play Fast (CDN)
        </button>
        <button class="btn-secondary btn-torrent-ep" style="padding: 8px 12px; font-size: 0.8rem; border-color: rgba(34, 197, 94, 0.4); color: var(--accent-green);">
          🌐 Torrent
        </button>
      </div>
    `;

    // Play Episode via Fast CDN
    row.querySelector('.btn-stream-fast').addEventListener('click', async () => {
      seriesModal.style.display = 'none';
      const episodeTitle = `${activeSeriesData.title} - S${String(seasonNumber).padStart(2, '0')}E${String(ep.episode).padStart(2, '0')}: ${ep.title}`;
      const servers = await window.api.getEpisodeServers({
        imdbId: activeSeriesData.imdbId,
        season: seasonNumber,
        episode: ep.episode
      });

      playFastWebStream({
        title: episodeTitle,
        type: 'series',
        imdbId: activeSeriesData.imdbId,
        season: seasonNumber,
        episode: ep.episode,
        poster: activeSeriesData.poster,
        background: activeSeriesData.background,
        webServers: servers
      });
    });

    // Play Episode via Torrent Swarm (P2P fallback)
    row.querySelector('.btn-torrent-ep').addEventListener('click', () => {
      seriesModal.style.display = 'none';
      const epQuery = `${activeSeriesData.title} S${String(seasonNumber).padStart(2, '0')}E${String(ep.episode).padStart(2, '0')}`;
      searchInput.value = epQuery;
      performSearch();
    });

    episodesList.appendChild(row);
  });
}

btnCloseModal.addEventListener('click', () => {
  seriesModal.style.display = 'none';
});

seriesModal.addEventListener('click', (e) => {
  if (e.target === seriesModal) {
    seriesModal.style.display = 'none';
  }
});

// ---------------- PLAYER MODES ----------------

// 1. Play Fast Web Stream (CDN)
function playFastWebStream(itemData) {
  activePlayerMode = 'web';
  isPlaybackActive = true;
  isDockedPaused = false;
  pausedIframeSrc = null;
  currentMovieData = itemData;
  currentMovieTitle = itemData.title;
  playerMovieTitle.textContent = itemData.title;

  stopTorrentEngine();

  switchView('player');

  webServerControls.style.display = 'flex';
  torrentControls.style.display = 'none';
  webPlayerFrame.style.display = 'block';
  videoPlayer.style.display = 'none';
  bufferingOverlay.style.display = 'none';
  torrentHud.style.display = 'none';
  torrentPlaylistBar.style.display = 'none';

  serverSelect.innerHTML = '';
  itemData.webServers.forEach((srv) => {
    const opt = document.createElement('option');
    opt.value = srv.url;
    opt.textContent = srv.name;
    serverSelect.appendChild(opt);
  });

  webPlayerFrame.src = itemData.webServers[0].url;

  serverSelect.onchange = () => {
    webPlayerFrame.src = serverSelect.value;
  };

  updateMiniPlayerInfo();

  // Save to Recently Watched
  saveRecentPlayback({
    id: itemData.imdbId ? `${itemData.imdbId}${itemData.season ? `_s${itemData.season}e${itemData.episode}` : ''}` : itemData.title,
    title: itemData.title,
    type: itemData.type || 'movie',
    poster: itemData.poster,
    background: itemData.background || itemData.poster,
    currentTime: pendingResumeTime || 0,
    duration: 0,
    mode: 'web',
    imdbId: itemData.imdbId,
    season: itemData.season,
    episode: itemData.episode,
    webServers: itemData.webServers
  });
  pendingResumeTime = null;
}

// 2. Play Torrent Stream (P2P Fallback with Multi-Episode Pack Support)
async function startTorrentStream({ magnet, title, sizeStr = '-', season, episode, fileIndex }) {
  activePlayerMode = 'torrent';
  isPlaybackActive = true;
  isDockedPaused = false;
  pausedIframeSrc = null;
  currentMovieTitle = title;
  playerMovieTitle.textContent = title;

  activeTorrentData = {
    magnet,
    title,
    sizeStr,
    season,
    episode,
    fileIndex: fileIndex ?? 0
  };

  webPlayerFrame.src = 'about:blank';
  webPlayerFrame.style.display = 'none';

  videoPlayer.style.display = 'block';
  webServerControls.style.display = 'none';
  torrentControls.style.display = 'flex';
  torrentHud.style.display = 'grid';

  hudSize.textContent = sizeStr;
  hudSpeed.textContent = '0 KB/s';
  hudPeers.textContent = '0';
  hudProgress.textContent = '0%';

  videoPlayer.pause();
  videoPlayer.removeAttribute('src');
  videoPlayer.load();

  switchView('player');
  bufferingOverlay.style.display = 'flex';
  overlayStatus.textContent = 'Connecting to P2P swarm...';
  overlaySubtext.textContent = 'Analyzing torrent files & discovering episodes in pack...';

  try {
    const res = await window.api.startStream({ magnet, title, season, episode, requestedFileIndex: fileIndex });
    activeStreamUrl = res.streamUrl;
    activeTorrentFileIndex = res.activeFileIndex;
    hudSize.textContent = res.fileSize || sizeStr;
    playerMovieTitle.textContent = `${title} - ${res.fileName}`;

    currentTorrentEpisodes = res.episodeFiles || [];
    setupTorrentEpisodeControls(currentTorrentEpisodes, res.activeFileIndex);

    videoPlayer.src = res.streamUrl;

    // Apply pending resume timestamp once loaded
    videoPlayer.onloadedmetadata = () => {
      if (pendingResumeTime && pendingResumeTime > 0 && pendingResumeTime < videoPlayer.duration) {
        videoPlayer.currentTime = pendingResumeTime;
        pendingResumeTime = null;
      }
    };
    if (pendingResumeTime && videoPlayer.duration > 0 && pendingResumeTime < videoPlayer.duration) {
      videoPlayer.currentTime = pendingResumeTime;
      pendingResumeTime = null;
    }

    videoPlayer.play().catch(playErr => {
      console.warn('Autoplay waiting for user interaction:', playErr);
    });

    videoPlayer.onplaying = () => {
      bufferingOverlay.style.display = 'none';
    };

    videoPlayer.onwaiting = () => {
      bufferingOverlay.style.display = 'flex';
      overlayStatus.textContent = 'Buffering stream...';
      overlaySubtext.textContent = 'Fetching next video pieces from swarm...';
    };

    // Codec & Format error handling with 1-click fallback to VLC
    videoPlayer.onerror = () => {
      console.warn('HTML5 Video Error:', videoPlayer.error);
      bufferingOverlay.style.display = 'flex';
      overlayStatus.textContent = '⚠️ Format / Codec Notice';
      overlaySubtext.innerHTML = `
        The built-in player cannot decode this file's audio/video codec (common with MKV, DTS, AC3, or HEVC).<br><br>
        <button id="btnCodecVlc" style="padding: 9px 18px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.4);">
          ▶ Open in External VLC
        </button>
      `;
      const btn = document.getElementById('btnCodecVlc');
      if (btn && activeStreamUrl) {
        btn.onclick = () => window.api.openExternalPlayer(activeStreamUrl);
      }
    };

    videoPlayer.onended = () => {
      playNextTorrentEpisode();
    };

    updateMiniPlayerInfo();

    // Initial Save to Continue Watching
    saveRecentPlayback({
      id: `torrent_${magnet.slice(0, 45)}_${res.activeFileIndex ?? 0}`,
      title: `${title} - ${res.fileName}`,
      type: 'torrent',
      poster: '',
      background: '',
      currentTime: pendingResumeTime || 0,
      duration: 0,
      mode: 'torrent',
      magnet: magnet,
      fileIndex: res.activeFileIndex,
      sizeStr: res.fileSize || sizeStr,
      season: season,
      episode: episode
    });
  } catch (err) {
    overlayStatus.textContent = 'Streaming Error';
    overlaySubtext.textContent = err || 'Could not start stream.';
  }
}

// Track and update continuous playback timestamp for Continue Watching
let lastProgressSave = 0;
videoPlayer.addEventListener('timeupdate', () => {
  const now = Date.now();
  if (now - lastProgressSave > 4000 && videoPlayer.duration > 0) {
    lastProgressSave = now;
    if (activePlayerMode === 'torrent' && activeStreamUrl && activeTorrentData) {
      saveRecentPlayback({
        id: `torrent_${activeTorrentData.magnet.slice(0, 45)}_${activeTorrentFileIndex ?? 0}`,
        title: playerMovieTitle.textContent || activeTorrentData.title,
        type: 'torrent',
        currentTime: videoPlayer.currentTime,
        duration: videoPlayer.duration,
        mode: 'torrent',
        magnet: activeTorrentData.magnet,
        fileIndex: activeTorrentFileIndex,
        sizeStr: hudSize.textContent || activeTorrentData.sizeStr,
        season: activeTorrentData.season,
        episode: activeTorrentData.episode
      });
    }
  }
});

videoPlayer.addEventListener('pause', () => {
  if (videoPlayer.duration > 0 && activePlayerMode === 'torrent' && activeTorrentData) {
    saveRecentPlayback({
      id: `torrent_${activeTorrentData.magnet.slice(0, 45)}_${activeTorrentFileIndex ?? 0}`,
      title: playerMovieTitle.textContent || activeTorrentData.title,
      type: 'torrent',
      currentTime: videoPlayer.currentTime,
      duration: videoPlayer.duration,
      mode: 'torrent',
      magnet: activeTorrentData.magnet,
      fileIndex: activeTorrentFileIndex,
      sizeStr: hudSize.textContent || activeTorrentData.sizeStr,
      season: activeTorrentData.season,
      episode: activeTorrentData.episode
    });
  }
});

// Multi-Episode Controls for Torrent Season Packs
function setupTorrentEpisodeControls(episodes, activeIndex) {
  if (!episodes || episodes.length <= 1) {
    torrentEpisodeControls.style.display = 'none';
    torrentPlaylistBar.style.display = 'none';
    return;
  }

  torrentEpisodeControls.style.display = 'flex';
  torrentPlaylistBar.style.display = 'flex';
  torrentPlaylistCount.textContent = `${episodes.length} episodes`;

  torrentEpisodeSelect.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const opt = document.createElement('option');
    opt.value = ep.index;
    opt.textContent = `Ep ${idx + 1}: ${ep.name} (${ep.sizeFormatted})`;
    if (ep.index === activeIndex) opt.selected = true;
    torrentEpisodeSelect.appendChild(opt);
  });

  torrentPlaylistGrid.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const btn = document.createElement('button');
    btn.className = `btn-secondary ${ep.index === activeIndex ? 'active' : ''}`;
    btn.style.textAlign = 'left';
    btn.style.padding = '10px 14px';
    btn.style.fontSize = '0.85rem';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.gap = '3px';
    if (ep.index === activeIndex) {
      btn.style.borderColor = 'var(--accent-orange)';
      btn.style.background = 'rgba(255, 120, 31, 0.15)';
      btn.style.boxShadow = '0 0 12px var(--accent-orange-glow)';
    }

    btn.innerHTML = `
      <span style="font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${ep.index === activeIndex ? '▶ ' : ''}Episode ${idx + 1}
      </span>
      <span style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${escapeHtml(ep.name)} (${escapeHtml(ep.sizeFormatted)})
      </span>
    `;

    btn.addEventListener('click', () => {
      switchTorrentEpisode(ep.index);
    });

    torrentPlaylistGrid.appendChild(btn);
  });

  torrentEpisodeSelect.onchange = () => {
    switchTorrentEpisode(parseInt(torrentEpisodeSelect.value, 10));
  };
}

async function switchTorrentEpisode(fileIndex) {
  if (fileIndex === activeTorrentFileIndex) return;

  bufferingOverlay.style.display = 'flex';
  overlayStatus.textContent = 'Switching Episode...';
  overlaySubtext.textContent = 'Prioritizing new episode pieces from swarm...';

  videoPlayer.pause();
  videoPlayer.removeAttribute('src');

  try {
    const res = await window.api.selectTorrentFile(fileIndex);
    if (!res.success) {
      alert('Could not switch episode: ' + (res.error || 'Unknown error'));
      bufferingOverlay.style.display = 'none';
      return;
    }

    activeStreamUrl = res.streamUrl;
    activeTorrentFileIndex = res.activeFileIndex;
    playerMovieTitle.textContent = `${currentMovieTitle} - ${res.fileName}`;
    hudSize.textContent = res.fileSize;

    setupTorrentEpisodeControls(currentTorrentEpisodes, res.activeFileIndex);

    videoPlayer.src = res.streamUrl;
    videoPlayer.play().catch(playErr => {
      console.warn('Playback waiting for interaction:', playErr);
    });

    updateMiniPlayerInfo();
  } catch (err) {
    alert('Failed to switch episode: ' + err.message);
    bufferingOverlay.style.display = 'none';
  }
}

function playNextTorrentEpisode() {
  if (!currentTorrentEpisodes || currentTorrentEpisodes.length === 0) return;
  const currentPos = currentTorrentEpisodes.findIndex(e => e.index === activeTorrentFileIndex);
  if (currentPos !== -1 && currentPos < currentTorrentEpisodes.length - 1) {
    switchTorrentEpisode(currentTorrentEpisodes[currentPos + 1].index);
  }
}

function playPrevTorrentEpisode() {
  if (!currentTorrentEpisodes || currentTorrentEpisodes.length === 0) return;
  const currentPos = currentTorrentEpisodes.findIndex(e => e.index === activeTorrentFileIndex);
  if (currentPos > 0) {
    switchTorrentEpisode(currentTorrentEpisodes[currentPos - 1].index);
  }
}

btnTorrentNextEp.addEventListener('click', playNextTorrentEpisode);
btnTorrentPrevEp.addEventListener('click', playPrevTorrentEpisode);

// ---------------- MINI-PLAYER DOCK LOGIC & PAUSE ON MINIMIZE ----------------

function updateMiniPlayerInfo() {
  miniTitle.textContent = currentMovieTitle || 'Now Playing';
  if (isDockedPaused) {
    miniStatusBadge.textContent = '⏸ Paused';
    miniStatusBadge.className = 'mini-status-badge paused';
    miniSub.textContent = 'Paused in Bottom Dock • Click to Resume';
    btnMiniTogglePlay.textContent = '▶';
    btnMiniTogglePlay.title = 'Resume Playback';
  } else {
    miniStatusBadge.textContent = '▶ Playing';
    miniStatusBadge.className = 'mini-status-badge playing';
    if (activePlayerMode === 'web') {
      miniSub.textContent = 'Streaming CDN • Playing in Background (Click to Expand)';
    } else {
      miniSub.textContent = `Streaming P2P [${hudSpeed.textContent} • ${hudPeers.textContent} peers]`;
    }
    btnMiniTogglePlay.textContent = '⏸';
    btnMiniTogglePlay.title = 'Pause Playback';
  }
}

// "← Back to Search" -> Collapse player to bottom dock without unloading stream
btnBackToResults.addEventListener('click', () => {
  if (isPlaybackActive) {
    if (activePlayerMode === 'torrent') {
      videoPlayer.pause();
      isDockedPaused = true;
    } else {
      isDockedPaused = false;
    }

    updateMiniPlayerInfo();
    miniPlayerBar.classList.add('active');
  }

  if (currentSearchResults.titles.length > 0 || currentSearchResults.torrents.length > 0) {
    switchView('results');
  } else {
    switchView('home');
  }
});

// Play / Pause Toggle inside bottom dock
btnMiniTogglePlay.addEventListener('click', (e) => {
  e.stopPropagation();

  if (isDockedPaused) {
    isDockedPaused = false;
    if (activePlayerMode === 'torrent') {
      videoPlayer.play().catch(console.warn);
    }
  } else {
    isDockedPaused = true;
    if (activePlayerMode === 'torrent') {
      videoPlayer.pause();
    }
  }

  updateMiniPlayerInfo();
});

// Expand from bottom mini-player back to full player view
function expandFullPlayer() {
  miniPlayerBar.classList.remove('active');
  switchView('player');

  if (isDockedPaused) {
    isDockedPaused = false;
    if (activePlayerMode === 'torrent') {
      videoPlayer.play().catch(console.warn);
    }
  }
}

miniPlayerClickable.addEventListener('click', expandFullPlayer);
btnMiniExpand.addEventListener('click', expandFullPlayer);

// Stop and completely close player from bottom dock
btnMiniClose.addEventListener('click', async (e) => {
  e.stopPropagation();
  miniPlayerBar.classList.remove('active');
  isPlaybackActive = false;
  isDockedPaused = false;
  pausedIframeSrc = null;
  webPlayerFrame.src = 'about:blank';
  await stopTorrentEngine();
});

async function stopTorrentEngine() {
  if (videoPlayer) {
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
  }
  await window.api.stopStream();
  activeStreamUrl = null;
  activeTorrentFileIndex = null;
  currentTorrentEpisodes = [];
}

// Cross-Fallback Switchers
btnSwitchToTorrent.addEventListener('click', () => {
  if (currentSearchResults.torrents && currentSearchResults.torrents.length > 0) {
    const topTorrent = currentSearchResults.torrents[0];
    startTorrentStream({
      magnet: topTorrent.magnet,
      title: topTorrent.title,
      sizeStr: topTorrent.sizeFormatted,
      season: currentMovieData?.season,
      episode: currentMovieData?.episode
    });
  } else {
    switchView('results');
    showTab('torrent');
  }
});

btnSwitchToFast.addEventListener('click', () => {
  if (currentSearchResults.titles && currentSearchResults.titles.length > 0) {
    playFastWebStream(currentSearchResults.titles[0]);
  } else {
    switchView('results');
    showTab('web');
  }
});

// Real-Time Torrent HUD updates
window.api.onStreamStats((data) => {
  if (activePlayerMode !== 'torrent') return;

  if (data.downloadSpeed !== undefined) {
    hudSpeed.textContent = formatSpeed(data.downloadSpeed);
  }
  if (data.numPeers !== undefined) {
    hudPeers.textContent = data.numPeers;
  }
  if (data.progress !== undefined) {
    hudProgress.textContent = `${data.progress.toFixed(1)}%`;
  }
  if (data.message && bufferingOverlay.style.display !== 'none') {
    overlaySubtext.textContent = data.message;
  }

  if (miniPlayerBar.classList.contains('active') && !isDockedPaused) {
    miniSub.textContent = `Streaming P2P [${hudSpeed.textContent} • ${hudPeers.textContent} peers]`;
  }
});

// Event Listeners
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch();
});

btnBackHome.addEventListener('click', () => {
  switchView('home');
});

btnOpenVLC.addEventListener('click', () => {
  if (activeStreamUrl) {
    window.api.openExternalPlayer(activeStreamUrl);
  } else {
    alert('Torrent stream is not ready yet.');
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Keyboard Shortcuts (Space: Play/Pause, F: Fullscreen, Arrows: Seek, M: Mute)
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    return;
  }

  if (currentView === 'player' || isPlaybackActive) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (activePlayerMode === 'torrent' && videoPlayer) {
        if (videoPlayer.paused) {
          videoPlayer.play().catch(console.warn);
        } else {
          videoPlayer.pause();
        }
      }
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.warn);
      } else {
        document.exitFullscreen().catch(console.warn);
      }
    } else if (e.code === 'ArrowLeft') {
      if (activePlayerMode === 'torrent' && videoPlayer && videoPlayer.duration > 0) {
        e.preventDefault();
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
      }
    } else if (e.code === 'ArrowRight') {
      if (activePlayerMode === 'torrent' && videoPlayer && videoPlayer.duration > 0) {
        e.preventDefault();
        videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
      }
    } else if (e.key === 'm' || e.key === 'M') {
      if (activePlayerMode === 'torrent' && videoPlayer) {
        e.preventDefault();
        videoPlayer.muted = !videoPlayer.muted;
      }
    }
  }
});

// Initial Load - Populate rich home catalog
loadHomeFeed();
