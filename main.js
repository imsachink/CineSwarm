const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

let mainWindow = null;
let wtClient = null;
let currentTorrent = null;
let currentServer = null;
let currentServerPort = null;
let statsInterval = null;

// High-speed tier-1 BitTorrent UDP/WSS trackers
const TIER1_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://tracker.tiny-vps.com:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://p4p.arenabg.com:1337/announce',
  'udp://movies.zsw.ca:6969/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://ipv4.tracker.harry.lu:80/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz'
];

const FEATURED_ITEMS = [
  {
    title: 'Sintel (2010)',
    type: 'movie',
    description: 'Blender Foundation 4K/1080p open-movie fantasy classic.',
    year: '2010',
    rating: '8.4',
    quality: '1080p',
    sizeFormatted: '129 MB',
    seeds: 210,
    imdbId: 'tt1727587',
    poster: 'https://images.metahub.space/poster/small/tt1727587/img',
    background: 'https://images.metahub.space/background/medium/tt1727587/img',
    magnet: 'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=' + TIER1_TRACKERS.map(encodeURIComponent).join('&tr=')
  },
  {
    title: 'Big Buck Bunny (2008)',
    type: 'movie',
    description: 'A large and lovable rabbit takes on bullying forest animals.',
    year: '2008',
    rating: '8.1',
    quality: '1080p',
    sizeFormatted: '276 MB',
    seeds: 115,
    imdbId: 'tt1254207',
    poster: 'https://images.metahub.space/poster/small/tt1254207/img',
    background: 'https://images.metahub.space/background/medium/tt1254207/img',
    magnet: 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=' + TIER1_TRACKERS.map(encodeURIComponent).join('&tr=')
  },
  {
    title: 'Tears of Steel (2012)',
    type: 'movie',
    description: 'Sci-fi short set in a dystopian future Amsterdam with cyborgs.',
    year: '2012',
    rating: '7.8',
    quality: '1080p',
    sizeFormatted: '571 MB',
    seeds: 80,
    imdbId: 'tt2451044',
    poster: 'https://images.metahub.space/poster/small/tt2451044/img',
    background: 'https://images.metahub.space/background/medium/tt2451044/img',
    magnet: 'magnet:?xt=urn:btih:209c8226b299b308e2414d5500ba4ecce08a0c81&dn=Tears+of+Steel&tr=' + TIER1_TRACKERS.map(encodeURIComponent).join('&tr=')
  },
  {
    title: 'Cosmos Laundromat (2015)',
    type: 'movie',
    description: 'Acclaimed surreal adventure by Mathieu Auvray & Blender Animation Studio.',
    year: '2015',
    rating: '7.9',
    quality: '1080p',
    sizeFormatted: '210 MB',
    seeds: 55,
    imdbId: 'tt4968092',
    poster: 'https://images.metahub.space/poster/small/tt4968092/img',
    background: 'https://images.metahub.space/background/medium/tt4968092/img',
    magnet: 'magnet:?xt=urn:btih:c9e15763f722f23e98a29decd97e387792ab24cf&dn=Cosmos+Laundromat&tr=' + TIER1_TRACKERS.map(encodeURIComponent).join('&tr=')
  }
];

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getMimeType(fileName) {
  const ext = (path.extname(fileName) || '').toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mkv':
      return 'video/x-matroska';
    case '.webm':
      return 'video/webm';
    case '.avi':
      return 'video/x-msvideo';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'video/mp4';
  }
}

function buildMagnet(infoHash, name) {
  const trQuery = TIER1_TRACKERS.map(t => '&tr=' + encodeURIComponent(t)).join('');
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}${trQuery}`;
}

async function getWebTorrentClient() {
  if (!wtClient) {
    const { default: WebTorrent } = await import('webtorrent');
    wtClient = new WebTorrent({
      maxConns: 200,
      dht: true,
    });
    wtClient.on('error', (err) => {
      console.error('WebTorrent client error:', err);
    });
  }
  return wtClient;
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icnsPath = path.join(__dirname, 'CineSwarm.icns');
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#090c12',
    title: 'CineSwarm Player',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
  });

  if (process.platform === 'darwin' && app.dock) {
    try {
      if (fs.existsSync(icnsPath)) {
        app.dock.setIcon(icnsPath);
      } else if (fs.existsSync(iconPath)) {
        app.dock.setIcon(iconPath);
      }
    } catch (e) {}
  }

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Prevent navigation of main window away from app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Targeted ad network blocklist (prevents false positives on video/audio tracks)
  const blockedAdDomains = [
    'popads.net', 'popcash.net', 'histats.com', 'doubleclick.net',
    'adservice.google.', 'adnxs.com', 'syndication.exdynsrv.com',
    'trafficjunky.com', 'coin-hive.com', 'propellerads.com', 'adsterra.com',
    'exoclick.com', 'onclickads.net', 'bet365', '1xbet', 'onclick'
  ];

  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url.toLowerCase();
    const isBlocked = blockedAdDomains.some(kw => url.includes(kw));
    if (isBlocked) {
      return callback({ cancel: true });
    }
    callback({ cancel: false });
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanUpStreaming();
  if (wtClient) {
    try {
      wtClient.destroy();
    } catch (e) {}
    wtClient = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  cleanUpStreaming();
  if (wtClient) {
    try {
      wtClient.destroy();
    } catch (e) {}
    wtClient = null;
  }
  // Clear temporary streaming directory to prevent filling disk
  try {
    const tempDir = path.join(app.getPath('temp'), 'cineswarm-player');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (e) {}
});

function cleanUpStreaming() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
  if (currentServer) {
    try {
      currentServer.close();
    } catch (e) {}
    currentServer = null;
    currentServerPort = null;
  }
  if (currentTorrent) {
    try {
      currentTorrent.destroy({ destroyStore: true });
    } catch (e) {}
    currentTorrent = null;
  }
}

// ---------------- IPC Handlers ----------------

// Helper: build CDN server list for movie or TV episode
function buildWebServers(imdbId, type = 'movie', season = 1, episode = 1) {
  if (type === 'series') {
    return [
      { name: 'Server 1 (VidSrc Pro)', url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}` },
      { name: 'Server 2 (AutoEmbed)', url: `https://autoembed.to/tv/imdb/${imdbId}-${season}-${episode}` },
      { name: 'Server 3 (2Embed)', url: `https://2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}` },
      { name: 'Server 4 (SuperEmbed)', url: `https://superembed.stream/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}` },
      { name: 'Server 5 (MultiEmbed)', url: `https://multiembed.mov/?video_id=${imdbId}&s=${season}&e=${episode}` }
    ];
  }
  return [
    { name: 'Server 1 (VidSrc Pro)', url: `https://vidsrc.me/embed/movie?imdb=${imdbId}` },
    { name: 'Server 2 (AutoEmbed)', url: `https://autoembed.to/movie/imdb/${imdbId}` },
    { name: 'Server 3 (2Embed)', url: `https://2embed.cc/embed/${imdbId}` },
    { name: 'Server 4 (SuperEmbed)', url: `https://superembed.stream/embed/movie?imdb=${imdbId}` },
    { name: 'Server 5 (MultiEmbed)', url: `https://multiembed.mov/?video_id=${imdbId}` }
  ];
}

// 1. Fetch Rich Home Feed (Trending Movies, Series & Hero Showcase)
ipcMain.handle('get-home-catalog', async () => {
  try {
    const [topMResp, sciMResp, actMResp, sResp] = await Promise.all([
      axios.get('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json', { timeout: 7000 }).catch(() => ({ data: { metas: [] } })),
      axios.get('https://v3-cinemeta.strem.io/catalog/movie/top/genre=Sci-Fi.json', { timeout: 7000 }).catch(() => ({ data: { metas: [] } })),
      axios.get('https://v3-cinemeta.strem.io/catalog/movie/top/genre=Action.json', { timeout: 7000 }).catch(() => ({ data: { metas: [] } })),
      axios.get('https://cinemeta-catalogs.strem.io/top/catalog/series/top.json', { timeout: 7000 }).catch(() => ({ data: { metas: [] } }))
    ]);

    // Aggregate and deduplicate movies
    const movieMap = new Map();
    [
      ...(topMResp.data.metas || []),
      ...(sciMResp.data.metas || []),
      ...(actMResp.data.metas || [])
    ].forEach(m => {
      const id = m.imdb_id || m.id;
      if (id && !movieMap.has(id)) {
        movieMap.set(id, {
          imdbId: id,
          type: 'movie',
          title: m.name,
          year: m.year || '',
          rating: m.imdbRating || '7.5',
          genres: m.genre || [],
          poster: m.poster || '',
          background: m.background || '',
          description: m.description || '',
          webServers: buildWebServers(id, 'movie')
        });
      }
    });

    const movies = Array.from(movieMap.values());

    const series = (sResp.data.metas || []).map(s => ({
      imdbId: s.imdb_id || s.id,
      type: 'series',
      title: s.name,
      year: s.year || '',
      rating: s.imdbRating || '8.2',
      genres: s.genre || [],
      poster: s.poster || '',
      background: s.background || '',
      description: s.description || '',
      webServers: buildWebServers(s.imdb_id || s.id, 'series', 1, 1)
    }));

    // Curate top 5 high-impact, stunning blockbusters for Hero Spotlight Carousel
    const heroCandidates = movies
      .filter(m => m.background && m.poster && m.description && m.description.length > 25)
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));

    const heroList = heroCandidates.slice(0, 5);
    const heroItem = heroList[0] || movies[0] || FEATURED_ITEMS[0];

    return {
      hero: heroItem,
      heroList: heroList.length > 0 ? heroList : [heroItem],
      trendingMovies: movies.slice(0, 18),
      trendingSeries: series.slice(0, 18),
      classics: FEATURED_ITEMS
    };
  } catch (err) {
    console.warn('Failed to load home feed:', err.message);
    return {
      hero: FEATURED_ITEMS[0],
      heroList: [FEATURED_ITEMS[0]],
      trendingMovies: [],
      trendingSeries: [],
      classics: FEATURED_ITEMS
    };
  }
});

// 2. Comprehensive Search: Movies + TV Series + Torrents in parallel
ipcMain.handle('search-movies', async (_, query) => {
  const trimmed = (query || '').trim();
  if (!trimmed) return { titles: [], torrents: [] };

  const fetchMovies = async () => {
    try {
      const url = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(trimmed)}.json`;
      const resp = await axios.get(url, { timeout: 7000 });
      if (resp.data && Array.isArray(resp.data.metas)) {
        return resp.data.metas.map(m => ({
          imdbId: m.imdb_id || m.id,
          type: 'movie',
          title: m.name,
          year: m.releaseInfo || m.year || '',
          rating: m.imdbRating || '7.5',
          poster: m.poster || '',
          description: m.description || '',
          webServers: buildWebServers(m.imdb_id || m.id, 'movie')
        }));
      }
    } catch (e) {}
    return [];
  };

  const fetchSeries = async () => {
    try {
      const url = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(trimmed)}.json`;
      const resp = await axios.get(url, { timeout: 7000 });
      if (resp.data && Array.isArray(resp.data.metas)) {
        return resp.data.metas.map(m => ({
          imdbId: m.imdb_id || m.id,
          type: 'series',
          title: m.name,
          year: m.releaseInfo || m.year || '',
          rating: m.imdbRating || '8.0',
          poster: m.poster || '',
          description: m.description || '',
          webServers: buildWebServers(m.imdb_id || m.id, 'series', 1, 1)
        }));
      }
    } catch (e) {}
    return [];
  };

  const fetchTorrents = async () => {
    const results = [];
    const seenHashes = new Set();

    const fetchApibay = async () => {
      try {
        const resp = await axios.get(`https://apibay.org/q.php?q=${encodeURIComponent(trimmed)}`, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
        });
        if (Array.isArray(resp.data)) {
          for (const item of resp.data) {
            if (!item.info_hash || item.id === '0') continue;
            const hash = item.info_hash.toLowerCase();
            if (seenHashes.has(hash)) continue;
            seenHashes.add(hash);

            const sizeNum = parseInt(item.size, 10) || 0;
            const seeds = parseInt(item.seeders, 10) || 0;
            const leechers = parseInt(item.leechers, 10) || 0;

            results.push({
              title: item.name,
              seeds,
              peers: leechers,
              sizeBytes: sizeNum,
              sizeFormatted: formatBytes(sizeNum),
              magnet: buildMagnet(item.info_hash, item.name),
              source: 'ThePirateBay'
            });
          }
        }
      } catch (err) {}
    };

    const fetchTorrentsCsv = async () => {
      try {
        const resp = await axios.get(`https://torrents-csv.com/service/search?q=${encodeURIComponent(trimmed)}&size=30`, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
        });
        if (resp.data && Array.isArray(resp.data.torrents)) {
          for (const item of resp.data.torrents) {
            if (!item.infohash) continue;
            const hash = item.infohash.toLowerCase();
            if (seenHashes.has(hash)) continue;
            seenHashes.add(hash);

            const sizeNum = item.size_bytes || 0;
            const seeds = item.seeders || 0;
            const leechers = item.leechers || 0;

            results.push({
              title: item.name,
              seeds,
              peers: leechers,
              sizeBytes: sizeNum,
              sizeFormatted: formatBytes(sizeNum),
              magnet: buildMagnet(item.infohash, item.name),
              source: 'TorrentsCSV'
            });
          }
        }
      } catch (err) {}
    };

    await Promise.allSettled([fetchApibay(), fetchTorrentsCsv()]);
    results.sort((a, b) => b.seeds - a.seeds);
    return results;
  };

  const [moviesList, seriesList, torrentsList] = await Promise.all([
    fetchMovies(),
    fetchSeries(),
    fetchTorrents()
  ]);

  const mergedTitles = [...seriesList, ...moviesList];

  return {
    titles: mergedTitles || [],
    torrents: torrentsList || []
  };
});

// 3. Get TV Series Season & Episode Details
ipcMain.handle('get-series-episodes', async (_, imdbId) => {
  if (!imdbId) return { seasons: {} };
  try {
    const url = `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`;
    const resp = await axios.get(url, { timeout: 8000 });
    if (resp.data && resp.data.meta && Array.isArray(resp.data.meta.videos)) {
      const seasons = {};
      resp.data.meta.videos.forEach(v => {
        const s = v.season !== undefined ? v.season : 1;
        if (!seasons[s]) seasons[s] = [];
        seasons[s].push({
          episode: v.episode || v.number || 1,
          season: s,
          title: v.name || `Episode ${v.episode || v.number || 1}`,
          overview: v.overview || v.description || '',
          thumbnail: v.thumbnail || ''
        });
      });
      Object.keys(seasons).forEach(k => {
        seasons[k].sort((a, b) => a.episode - b.episode);
      });
      return { seasons, meta: resp.data.meta };
    }
  } catch (err) {
    console.warn('Failed to fetch series episodes:', err.message);
  }
  return { seasons: {} };
});

// 4. Build Servers for Episode
ipcMain.handle('get-episode-servers', (_, { imdbId, season, episode }) => {
  return buildWebServers(imdbId, 'series', season, episode);
});

// Prioritize pieces for a target file
function prioritizeFilePieces(torrent, file) {
  if (!torrent || !file) return;

  torrent.files.forEach((f) => {
    if (f === file) {
      f.select();
    } else {
      f.deselect();
    }
  });

  const startPiece = file._startPiece || 0;
  const endPiece = file._endPiece || torrent.pieces.length - 1;
  const initialBatch = Math.min(startPiece + 15, endPiece);
  for (let p = startPiece; p <= initialBatch; p++) {
    if (typeof torrent.critical === 'function') {
      torrent.critical(p);
    }
  }
}

// 5. Start Streaming a Torrent
ipcMain.handle('start-stream', async (event, { magnet, title, season, episode, requestedFileIndex }) => {
  if (!magnet || typeof magnet !== 'string' || !magnet.startsWith('magnet:?')) {
    throw new Error('Invalid magnet link provided.');
  }

  cleanUpStreaming();

  const client = await getWebTorrentClient();

  return new Promise((resolve, reject) => {
    let resolved = false;
    let connectTimeout = null;

    const cleanupAndReject = (errMsg) => {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (!resolved) {
        resolved = true;
        cleanUpStreaming();
        reject(errMsg);
      }
    };

    const sendStatus = (state, extra = {}) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stream-stats', {
          state,
          title,
          progress: currentTorrent ? (currentTorrent.progress * 100) : 0,
          downloadSpeed: currentTorrent ? currentTorrent.downloadSpeed : 0,
          uploadSpeed: currentTorrent ? currentTorrent.uploadSpeed : 0,
          numPeers: currentTorrent ? currentTorrent.numPeers : 0,
          downloaded: currentTorrent ? currentTorrent.downloaded : 0,
          total: currentTorrent ? currentTorrent.length : 0,
          ...extra
        });
      }
    };

    sendStatus('connecting', { message: 'Connecting to swarm and contacting trackers...' });

    // 30s timeout so app never spins forever on dead/seedless swarms
    connectTimeout = setTimeout(() => {
      cleanupAndReject('Connection timed out: No active seeders found in swarm within 30s.');
    }, 30000);

    try {
      const existing = client.get(magnet);
      if (existing) {
        currentTorrent = existing;
      } else {
        currentTorrent = client.add(magnet, {
          path: path.join(app.getPath('temp'), 'cineswarm-player'),
        });
      }
    } catch (addErr) {
      return cleanupAndReject(addErr.message);
    }

    currentTorrent.on('error', (err) => {
      console.error('Torrent error:', err);
      sendStatus('error', { message: err.message });
      cleanupAndReject(err.message);
    });

    statsInterval = setInterval(() => {
      if (currentTorrent) {
        sendStatus(currentTorrent.ready ? 'streaming' : 'buffering');
      }
    }, 500);

    const onTorrentReady = () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }

      sendStatus('ready', { message: 'Swarm metadata acquired. Initializing media files...' });

      const videoExtensions = /\.(mp4|mkv|webm|avi|mov|m4v)$/i;
      const videoFiles = currentTorrent.files.filter(f => videoExtensions.test(f.name) && !/sample/i.test(f.name));

      if (videoFiles.length === 0) {
        const errorMsg = 'No playable video files found in this torrent.';
        sendStatus('error', { message: errorMsg });
        return cleanupAndReject(errorMsg);
      }

      videoFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      const episodeFileList = videoFiles.map((f) => ({
        index: currentTorrent.files.indexOf(f),
        name: f.name,
        sizeFormatted: formatBytes(f.length),
        length: f.length
      }));

      let targetFile = null;

      if (requestedFileIndex !== undefined && currentTorrent.files[requestedFileIndex]) {
        targetFile = currentTorrent.files[requestedFileIndex];
      }

      // Strict season & episode matching (prevents false matches like 'x264e01')
      if (!targetFile && season !== undefined && episode !== undefined) {
        const sNum = parseInt(season, 10);
        const eNum = parseInt(episode, 10);

        targetFile = videoFiles.find(f => {
          const name = f.name;
          // Matches S01E02, S1.E2, S01 - E02
          const seMatch = name.match(/[sS](\d+)[\. -]*[eE](\d+)/i);
          if (seMatch && parseInt(seMatch[1], 10) === sNum && parseInt(seMatch[2], 10) === eNum) {
            return true;
          }
          // Matches 1x02
          const xMatch = name.match(/(?:^|\D)(\d+)x(\d+)(?:\D|$)/i);
          if (xMatch && parseInt(xMatch[1], 10) === sNum && parseInt(xMatch[2], 10) === eNum) {
            return true;
          }
          // Matches Season 1 Episode 2
          const wordMatch = name.match(/season\s*(\d+)[\s\S]*?episode\s*(\d+)/i);
          if (wordMatch && parseInt(wordMatch[1], 10) === sNum && parseInt(wordMatch[2], 10) === eNum) {
            return true;
          }
          return false;
        });
      }

      if (!targetFile) {
        targetFile = videoFiles[0];
      }

      const activeFileIndex = currentTorrent.files.indexOf(targetFile);
      prioritizeFilePieces(currentTorrent, targetFile);

      currentServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          return res.end();
        }

        const match = req.url.match(/\/video\/(\d+)/);
        const reqIndex = match ? parseInt(match[1], 10) : activeFileIndex;
        const serveFile = (currentTorrent && currentTorrent.files && currentTorrent.files[reqIndex]) ? currentTorrent.files[reqIndex] : targetFile;

        if (!serveFile) {
          res.writeHead(404);
          return res.end('File not found');
        }

        const range = req.headers.range;
        const total = serveFile.length;
        const mimeType = getMimeType(serveFile.name);

        if (!range) {
          res.writeHead(200, {
            'Content-Length': total,
            'Accept-Ranges': 'bytes',
            'Content-Type': mimeType
          });
          const stream = serveFile.createReadStream();
          stream.on('error', () => {});
          res.on('error', () => stream.destroy());
          stream.pipe(res);
          req.on('close', () => stream.destroy());
        } else {
          const parts = range.replace(/bytes=/, '').split('-');
          let start = parts[0] ? parseInt(parts[0], 10) : NaN;
          let end = parts[1] ? parseInt(parts[1], 10) : NaN;

          if (isNaN(start)) {
            // Suffix range: bytes=-500 -> last 500 bytes
            start = total - end;
            end = total - 1;
          } else if (isNaN(end)) {
            end = total - 1;
          }

          if (isNaN(start) || isNaN(end) || start > end || start >= total || start < 0) {
            res.writeHead(416, { 'Content-Range': `bytes */${total}` });
            return res.end();
          }

          end = Math.min(end, total - 1);
          const chunkSize = (end - start) + 1;

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mimeType
          });

          const stream = serveFile.createReadStream({ start, end });
          stream.on('error', () => {});
          res.on('error', () => stream.destroy());
          stream.pipe(res);
          req.on('close', () => stream.destroy());
        }
      });

      currentServer.listen(0, '127.0.0.1', () => {
        currentServerPort = currentServer.address().port;
        const streamUrl = `http://127.0.0.1:${currentServerPort}/video/${activeFileIndex}`;

        sendStatus('streaming', {
          streamUrl,
          activeFileIndex,
          fileName: targetFile.name,
          fileSize: formatBytes(targetFile.length),
          episodeFiles: episodeFileList,
          message: 'Stream connected. Playing...'
        });

        if (!resolved) {
          resolved = true;
          resolve({
            streamUrl,
            activeFileIndex,
            fileName: targetFile.name,
            fileSize: formatBytes(targetFile.length),
            totalBytes: targetFile.length,
            episodeFiles: episodeFileList
          });
        }
      });

      currentServer.on('error', (err) => {
        console.error('Streaming server error:', err);
        sendStatus('error', { message: err.message });
      });
    };

    if (currentTorrent.ready) {
      onTorrentReady();
    } else {
      currentTorrent.once('ready', onTorrentReady);
    }
  });
});

// 6. Switch Active File / Episode inside an already running Torrent Pack
ipcMain.handle('select-torrent-file', async (_, fileIndex) => {
  if (!currentTorrent || !currentTorrent.files || !currentTorrent.files[fileIndex] || !currentServerPort) {
    return { success: false, error: 'Torrent or file not available' };
  }

  const newTarget = currentTorrent.files[fileIndex];
  prioritizeFilePieces(currentTorrent, newTarget);

  const streamUrl = `http://127.0.0.1:${currentServerPort}/video/${fileIndex}`;

  return {
    success: true,
    streamUrl,
    activeFileIndex: fileIndex,
    fileName: newTarget.name,
    fileSize: formatBytes(newTarget.length)
  };
});

// 7. Stop Streaming
ipcMain.handle('stop-stream', () => {
  cleanUpStreaming();
  return { success: true };
});

// 8. Open stream in External Media Player (e.g. VLC) - Secure execution without shell injection
ipcMain.handle('open-external-player', (_, streamUrl) => {
  if (!streamUrl || typeof streamUrl !== 'string') return { success: false, error: 'No stream URL' };

  try {
    const parsed = new URL(streamUrl);
    if (parsed.protocol !== 'http:' || (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost')) {
      return { success: false, error: 'Invalid stream URL' };
    }
  } catch {
    return { success: false, error: 'Malformed URL' };
  }

  if (process.platform === 'darwin') {
    const child = spawn('open', ['-a', 'VLC', streamUrl]);
    child.on('error', () => {
      spawn('open', [streamUrl]);
    });
  } else if (process.platform === 'win32') {
    const child = spawn('cmd.exe', ['/c', 'start', 'vlc', streamUrl]);
    child.on('error', () => {
      spawn('cmd.exe', ['/c', 'start', streamUrl]);
    });
  } else {
    const child = spawn('vlc', [streamUrl]);
    child.on('error', () => {
      spawn('xdg-open', [streamUrl]);
    });
  }

  return { success: true };
});
