# 🎌 AniXO - Premium Anime Streaming Platform

AniXO is a high-performance, full-stack anime streaming application built with a modern React frontend and a powerful Python scraping engine. It features seamless integration with AniList, MAL (Jikan), and Kitsu to provide a rich metadata experience and stable streaming.

---

## 🏗️ Project Structure

Below is the complete architectural layout of the project:

```text
anixo/
├── api/                    # 🐍 Python Backend (Vercel Functions)
│   └── index.py            # Unified API Core (Anikai, Aniwatch, Kitsu Fallback)
├── src/                    # ⚛️ React (Vite) Frontend
│   ├── components/         # Reusable UI Components
│   │   ├── common/         # AnimeCard, SkeletonCard, etc.
│   │   ├── home/           # Hero, AnimeRow, ThreeColumnSection
│   │   ├── layout/         # Navbar, Footer
│   │   └── watch/          # VideoPlayer, EpisodeList
│   ├── pages/              # Main Application Views
│   │   ├── Home.jsx        # Landing Page
│   │   ├── Watch.jsx       # Custom Video Player & Detailed Info
│   │   └── Browse.jsx      # Advanced Search & Filtering
│   ├── services/           # Data & API Layer
│   │   ├── api.js          # AniList GraphQL & Backend Fetchers
│   │   └── anikaiMapping.js # Metadata Scoring & Resolution
│   ├── context/            # Global State (Language, User Lists)
│   └── App.jsx             # Main Router & Provider Setup
├── public/                 # Static Assets (Images, Icons)
├── vercel.json             # Deployment & API Routing Config
├── vite.config.js          # Vite Bundler Configuration
├── package.json            # Frontend Dependencies & Scripts
└── requirements.txt        # Python Backend Dependencies
```

---

## 🌟 Key Features

- 🎬 **Unified Streaming Engine:** Combines multiple scrapers to resolve high-quality `m3u8` links.
- 🖼️ **Smart Thumbnail Fallback:** Advanced logic that pulls episode stills from **MAL (Jikan)** and **Kitsu** if AniList is missing info.
- 🎙️ **Language Precision:** Dedicated handling for Sub/Dub/Softsub tracks with strict group resolution.
- 📱 **Mobile Optimized:** Fully responsive design with Focus Mode for an immersive viewing experience.
- 📊 **Rich Metadata:** Real-time data from AniList, including character cast, staff, and recommendations.
- ⚡ **Lightning Fast:** Built on Vite and TanStack Query for near-instant navigation and caching.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + **Vite**
- **TanStack Query (v5)** (Data Fetching/Caching)
- **Tailwind CSS 4** (Modern Styling)
- **Plyr + HLS.js** (Native Streaming Player)
- **Lucide React** (Premium Iconography)

### Backend
- **Python 3.10+**
- **Flask** (API Framework)
- **BeautifulSoup4** (HTML Scraping)
- **Vercel** (Serverless Hosting)

---

## 🚀 Getting Started

### 1. Prerequisite
Ensure you have **Node.js 20+** and **Python 3.10+** installed.

### 2. Frontend Setup
```bash
cd anixo
npm install
npm run dev
```

### 3. Backend Setup
```bash
cd anixo/api
pip install -r ../requirements.txt
python index.py
```

---

## 👤 Author
Developed with ❤️ by the AniXO Team.  
*Educational use only.*
