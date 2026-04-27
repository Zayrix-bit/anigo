# Project Status: Anixo - Backend Deployment & Configuration

## Context for the Next AI Agent
The user is deploying an Anime streaming website (Anixo) on Vercel. Currently, the frontend is working on `anixo.online`, but the backends (Python Flask & Node.js) are experiencing 500 Internal Server Errors on Vercel.

## Current Project Structure
- **Frontend**: Vite + React (located in root `/`)
- **Python Backend**: Flask (located in `/api/index.py`)
- **Node.js Backend**: Express (located in `/backend-core/` with entry point at `/api/user.js`)
- **Routing**: Handled by `vercel.json` rewrites.

## What has been fixed so far:
1. **API Base URL Centralization**: Created `src/config/apiBase.js` to handle environment-specific URLs and block `localhost` in production.
2. **Environment Variables**: Overridden `localhost` defaults in `.env.production`.
3. **Build Validation**: Added `scripts/validate-prod-bundle.mjs` to prevent accidental inclusion of `localhost` in production builds.
4. **Vite Config**: Adjusted `chunkSizeWarningLimit` and added `manualChunks` for better performance.
5. **Python Backend**: 
   - Added `pycryptodome` and `gunicorn` to `requirements.txt`.
   - Fixed the "Crypto" import error in `api/index.py` by adding a multi-try import logic (Crypto, Cryptodome, crypto).
   - Added `/api/health` route for status checks.
   - Created `Procfile` for Render/Railway migration.
   - Added `api/__init__.py` for proper package importing.
6. **Node Backend**: 
   - Improved MongoDB connection error handling in `backend-core/src/config/db.js`.
   - Updated `backend-core/src/app.js` to support both `/health` and `/node-health` routes.
   - Created `backend-core/Procfile` for Render migration.

## Current Blockers (Immediate Priority):
- **500 Errors on Vercel**: Even after fixes, the Python backend is sometimes crashing with `FUNCTION_INVOCATION_FAILED`.
- **Environment Variables**: `MONGO_URI` and `JWT_SECRET` must be set in Vercel Dashboard for the Node.js backend to work.
- **Vercel Logs**: The last logs showed `ModuleNotFoundError: No module named 'Crypto'` which was addressed in the last edit, but needs verification after redeploy.

## Pending Tasks:
1. **Migration to Render/Railway**:
   - Deploy **Python Backend**: Point to root, use `pip install -r requirements.txt`, and start command `gunicorn api.index:app --bind 0.0.0.0:$PORT --timeout 120`.
   - Deploy **Node.js Backend**: Point to `backend-core/` directory, use `npm install`, and start command `npm start`.
   - Set Environment Variables:
     - Python: (None required unless scraping needs proxies).
     - Node.js: `MONGO_URI` and `JWT_SECRET`.
2. **Update Frontend**:
   - Once backends are live, update Vercel Environment Variables:
     - `VITE_PYTHON_API`: `https://your-python-service.onrender.com`
     - `VITE_NODE_API`: `https://your-node-service.onrender.com`
     - `VITE_AUTH_API`: `https://your-node-service.onrender.com` (usually same as Node API)
3. **Verification**:
   - Verify `/api/health` and `/node-health` on the new services.
   - Test login/watchlist features on the frontend.

## User's Strategic Preference: Deployment Migration
The user has expressed interest in moving the backend deployment away from Vercel to a more stable platform (like Render, Railway, or a VPS). 

### Recommendation for Next Agent:
- If Vercel 500 errors persist after the current fixes, **do not waste more time on Vercel's serverless limitations.**
- Proactively help the user migrate the **Python Flask** and **Node.js** backends to **Render.com** or **Railway.app**.
- **Migration Steps needed**:
  1. Create a `Procfile` for Render/Railway.
  2. Update Frontend `.env` variables (`VITE_PYTHON_API`, `VITE_NODE_API`) to point to the new service URLs.
  3. Ensure CORS is configured for `anixo.online` on the new host.
  4. Move `MONGO_URI` and `JWT_SECRET` to the new platform's environment settings.

## Key Files to Watch:
- `vercel.json`: Routing rules.
- `api/index.py`: Python Flask backend logic.
- `api/user.js`: Node.js Vercel entry point.
- `src/config/apiBase.js`: Frontend API resolution.
- `backend-core/src/app.js`: Node.js main app logic.
