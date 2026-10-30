# 🎬 CineSwarm Video Player

<p align="center">
  <img src="icon.png" alt="CineSwarm Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);" />
</p>

<p align="center">
  <b>Instant 1-Second CDN Web Streams + Decentralized P2P Swarms for Movies & TV Series</b><br>
  Cross-platform desktop media player with Chromecast casting, dual catalog search, and season pack support.
</p>

<p align="center">
  <a href="https://github.com/imsachink/CineSwarm/releases"><img src="https://img.shields.io/github/v/release/imsachink/CineSwarm?style=flat-square&color=6366f1" alt="Latest Release" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## 📥 Downloads (Binaries)

Download the latest version for your operating system from the **[Releases Page](https://github.com/imsachink/CineSwarm/releases)**:

| Operating System | Download File | Description |
| :--- | :--- | :--- |
| **Windows** | `CineSwarm-Setup.exe` | Standard Windows Installer (creates Start menu & Desktop shortcuts) |
| **Windows** | `CineSwarm-Portable.exe` | Standalone portable executable (no installation required) |
| **macOS** | `CineSwarm.dmg` | Apple Disk Image for macOS (drag-and-drop install) |
| **macOS** | `CineSwarm-macOS.zip` | Standalone macOS application zip archive |

---

## 🛠️ Installation & Warning Guides

Because **CineSwarm** is an open-source indie application without an expensive enterprise code-signing certificate (\$400+/year), Windows SmartScreen and macOS Gatekeeper may show a security prompt on first launch. Follow the simple steps below to run the app:

### 🪟 Windows Installation & "Windows protected your PC" Fix

1. Download `CineSwarm-Setup.exe` or `CineSwarm-Portable.exe`.
2. Double-click the file to open it.
3. If Windows displays **"Windows protected your PC"** (SmartScreen):
   - Click on **"More info"** (under the warning text).
   - Click the **"Run anyway"** button that appears.
4. CineSwarm will launch immediately.

---

### 🍏 macOS Installation & Gatekeeper Fix

1. Download `CineSwarm.dmg`.
2. Double-click the `.dmg` file and drag **CineSwarm** into your **Applications** folder.
3. If macOS displays: *"CineSwarm cannot be opened because Apple cannot check it for malicious software"* or *"damaged and cannot be opened"*:
   - **Method A (Guaranteed — Terminal one-liner):**
     Open **Terminal** and run:
     ```bash
     xattr -cr /Applications/CineSwarm.app
     ```
     This removes the macOS download quarantine flag and allows CineSwarm to launch immediately.
   - **Method B (via System Settings):**
     1. Open **System Settings** ➔ **Privacy & Security**.
     2. Scroll down to the **Security** section.
     3. Click **"Open Anyway"** next to *CineSwarm* and enter your Mac password.

---

## 📺 How to Cast to TV (Chromecast & Smart TVs)

CineSwarm makes casting torrents and high-res movies to your TV seamless:

1. Start streaming any movie or episode in CineSwarm.
2. Click the **"Open in External VLC"** button in the player toolbar.
3. In VLC's top menu bar, select:
   - **Playback** ➔ **Renderer** ➔ **Select your Chromecast / Android TV / Smart TV**.
4. VLC will automatically stream the video directly to your TV with full multitrack audio (AC3/DTS) and subtitles.

*(Note: Both your computer and your TV must be connected to the same local Wi-Fi network).*

---

## 🚀 Key Features

* **⚡ Instant 1-Second CDN Streaming**: High-speed CDN nodes with multi-server redundancy (VidSrc Pro, AutoEmbed, 2Embed, SuperEmbed, MultiEmbed).
* **🌐 Decentralized P2P Swarm Fallback**: Powered by WebTorrent with native HTTP 206 Byte-Range streaming for titles not on CDNs.
* **📺 Complete Series & Season Packs**: Interactive season and episode picker with automatic file targeting inside massive multi-episode torrent packs.
* **🛡️ Built-in Ad-Shield**: Blocks 100% of popup ad windows, third-party redirects, and click-hijacking overlays.
* **⏱️ Continue Watching**: Automatically tracks your exact playback position across both CDN streams and torrents.
* **⌨️ Keyboard Shortcuts**:
  - `Space`: Play / Pause
  - `F`: Toggle Fullscreen
  - `←` / `→`: Seek -10s / +10s
  - `M`: Mute / Unmute

---

## ⚖️ Media License & Legal Disclaimer

* **Client-Side Aggregator**: CineSwarm is an open-source software application that functions strictly as an interactive media player, stream renderer, and catalog search aggregator.
* **Zero Hosting**: CineSwarm does not host, upload, store, archive, or distribute any video files, media content, or copyright-protected materials on any servers.
* **Decentralized & Third-Party Indexing**: All media playback is either streamed directly from publicly available third-party web embeds or fetched from decentralized peer-to-peer (P2P) swarms across the public BitTorrent DHT network.
* **End-User Responsibility**: The developers of CineSwarm do not endorse, promote, or encourage copyright infringement. Users are solely responsible for ensuring their use of the software complies with all applicable local, national, and international laws and regulations.
