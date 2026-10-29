const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getHomeCatalog: () => ipcRenderer.invoke('get-home-catalog'),
  searchMovies: (query) => ipcRenderer.invoke('search-movies', query),
  getSeriesEpisodes: (imdbId) => ipcRenderer.invoke('get-series-episodes', imdbId),
  getEpisodeServers: (params) => ipcRenderer.invoke('get-episode-servers', params),
  startStream: (params) => ipcRenderer.invoke('start-stream', params),
  selectTorrentFile: (fileIndex) => ipcRenderer.invoke('select-torrent-file', fileIndex),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  openExternalPlayer: (url) => ipcRenderer.invoke('open-external-player', url),
  onStreamStats: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('stream-stats', listener);
    return () => ipcRenderer.removeListener('stream-stats', listener);
  }
});
