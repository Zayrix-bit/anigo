# 🎌 AniXO - Premium Anime Streaming Platform

AniXO is a high-performance, full-stack anime streaming application. It features a modern React frontend, a powerful Python scraping engine, and a Node.js user backend for managing watchlists and progress.

---

## 🏗️ Project Structure

Below is the complete architectural layout of the project:

```text
anixo/
├── api/                    # 🚀 Unified Backend (Vercel Functions)
│   ├── index.py            # 🐍 Python Scraper (Gogoanime, Miruro)
│   ├── user.js             # 🟢 Node.js Gateway (Auth, Watchlist)
│   ├── user-backend/       # 📂 Core Node.js Logic & Models
│   └── package.json        # 📦 Node.js Backend Dependencies
├── src/                    # ⚛️ React (Vite) Frontend
│   ├── services/api.js     # 📡 Unified API Layer (Domain Agnostic)
│   ├── pages/              # 🖼️ Application Views (Home, Watch, Browse)
│   └── ...
├── vercel.json             # 🌍 Deployment & Routing Config
├── vite.config.js          # ⚡ Local Development Proxy
├── package.json            # 📦 Frontend Dependencies
└── requirements.txt        # 🐍 Python Dependencies
```

---

## 🌟 Key Features

- 🎬 **Unified Streaming Engine:** Combines multiple scrapers to resolve high-quality links.
- 🔐 **User System:** Full Authentication, Watchlist management, and Progress tracking.
- 🖼️ **Smart Thumbnail Fallback:** Pulls episode stills from **MAL** and **Kitsu** if AniList is missing info.
- 📱 **Mobile Optimized:** Fully responsive design with premium UI/UX for all devices.
- ⚡ **Environment Agnostic:** Works perfectly on `anixo.online` and `localhost` without code changes.

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
npm install
npm run dev
```

### 3. Python Scraper Setup
```bash
# From root
pip install -r requirements.txt
python api/index.py
```

### 4. Node.js Backend Setup
```bash
cd api
npm install
npm run dev   # Runs on port 5001 to avoid conflict
```

---

## 👤 Author
Developed with ❤️ by the AniXO Team.  
*Educational use only.*
