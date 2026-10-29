# 🎬 CineSwarm Video Player

An open-source, cross-platform video player that combines **Instant 1-Second CDN Web Streams** with **Decentralized P2P Media Swarms** — with full support for **Movies and TV Series (Seasons & Episodes)**.

---

## 🚀 Key Features

### 1. 📺 Full TV Series & Movie Support
- **Dual Catalog Search**: Automatically searches both movies and TV series across decentralized indexes.
- **Interactive Season & Episode Picker**: Browse all seasons and episodes with episode titles, overviews, and thumbnail artwork.
- **Episode-Specific Playback**: Automatically requests the exact Season and Episode across both CDN servers and torrent season packs.

### 2. ⚡ Fast CDN Streams (1-Second Playback, No Buffering)
- High-speed CDN nodes with multi-server redundancy (VidSrc Pro, AutoEmbed, 2Embed, SuperEmbed, MultiEmbed).
- **Built-in Ad-Shield**: Blocks 100% of popup ad windows and redirect networks for a clean, distraction-free player.

### 3. 🌐 Automatic P2P Torrent Swarm Fallback
- For content, regional films, or episodes not hosted on web CDNs, the app automatically falls back to decentralized BitTorrent swarms.
- **Sequential Streaming Engine**: Powered by WebTorrent with native HTTP 206 Byte-Range streaming (no full download needed).
- **Episode Targeting**: Automatically detects and streams the requested episode file even inside complete season torrent packs.
- **External VLC Support**: 1-click **"Open in External VLC"** button for hardware decoding and multitrack audio (AC3/DTS).

---

## 🛠️ How to Run

```bash
# Navigate to the project directory
cd "cineswarm"

# Launch the app
npm start
```

### 🧪 Test Scenarios
1. **Search a TV Show**: Type `Breaking Bad`, `Dark`, or `Loki`. Click **"Browse Episodes"**, select any season & episode, and stream immediately.
2. **Search a Movie**: Type `Piku` or `Inception`. Click **"Play Instantly"** for 1-second CDN streaming.
3. **P2P Swarm Fallback**: If an item is not on CDN, switch to the **"🌐 P2P Torrent Swarms"** tab to stream directly from seeders.
