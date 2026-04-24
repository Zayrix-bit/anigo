import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { backendApi } from "../services/api";
import { User, Clock, Heart, Bell, Download, Settings as SettingsIcon, FileText, Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// Radio button component (declared outside to avoid re-creation on render)
const Radio = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onChange}>
    <div className="relative flex items-center justify-center">
      <div className={`w-[16px] h-[16px] rounded-full border ${checked ? 'border-red-600' : 'border-white/20'} transition-all`} />
      {checked && <div className="absolute w-[8px] h-[8px] rounded-full bg-red-600" />}
    </div>
    <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-white/50'}`}>{label}</span>
  </label>
);

// ─── AniList GraphQL Query ───
const ANILIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      status
      entries {
        mediaId
        status
        progress
        score(format: POINT_10)
        media {
          title {
            romaji
            english
          }
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

const ANILIST_STATUS_MAP = {
  CURRENT: "Watching",
  PLANNING: "Planning",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "On-Hold",
  REPEATING: "Watching"
};

// ─── MAL XML Parser ───
function parseMALXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const animeNodes = doc.querySelectorAll("anime");
  const items = [];

  animeNodes.forEach((node) => {
    const getField = (name) => node.querySelector(name)?.textContent || "";
    const malStatus = getField("my_status");

    const statusMap = {
      "Watching": "Watching",
      "Completed": "Completed",
      "On-Hold": "On-Hold",
      "Dropped": "Dropped",
      "Plan to Watch": "Planning",
      "1": "Watching",
      "2": "Completed",
      "3": "On-Hold",
      "4": "Dropped",
      "6": "Planning"
    };

    items.push({
      animeId: getField("series_animedb_id"),
      title: getField("series_title"),
      status: statusMap[malStatus] || "Planning",
      progress: parseInt(getField("my_watched_episodes")) || 0,
      score: parseInt(getField("my_score")) || 0,
      coverImage: ""
    });
  });

  return items;
}

// ─── JSON File Parser ───
function parseJsonFile(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (Array.isArray(data)) {
      return data.map(item => ({
        animeId: String(item.animeId || item.id || ""),
        title: item.title || "",
        coverImage: item.coverImage || "",
        status: item.status || "Planning",
        progress: item.progress || 0,
        score: item.score || 0
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export default function ImportExport() {
  const { user, globalWatchlist, setGlobalWatchlist } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("import");

  // Import state
  const [importFrom, setImportFrom] = useState("MAL");
  const [username, setUsername] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState("Merge");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importProgress, setImportProgress] = useState("");

  // Export state
  const [exportFormat, setExportFormat] = useState("TEXT");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  // ─── Fetch from AniList API ───
  const fetchAniListData = async (anilistUsername) => {
    setImportProgress("Fetching anime list from AniList...");
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { username: anilistUsername }
      })
    });

    const json = await response.json();

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "AniList API error. Make sure your list is public.");
    }

    const lists = json.data?.MediaListCollection?.lists || [];
    const items = [];

    for (const list of lists) {
      for (const entry of list.entries) {
        items.push({
          animeId: String(entry.mediaId),
          title: entry.media?.title?.english || entry.media?.title?.romaji || `Anime ${entry.mediaId}`,
          coverImage: entry.media?.coverImage?.large || "",
          status: ANILIST_STATUS_MAP[entry.status] || "Planning",
          progress: entry.progress || 0,
          score: entry.score || 0
        });
      }
    }

    return items;
  };

  // ─── Read file content ───
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // ─── Main Import Handler ───
  const handleImport = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    setImportResult(null);
    setImportProgress("");

    try {
      let items = [];

      if (importFrom === "AL") {
        // AniList - fetch via username
        if (!username.trim()) throw new Error("Please enter your AniList username.");
        items = await fetchAniListData(username.trim());
      } else if (importFrom === "MAL") {
        // MAL - parse XML file
        if (!importFile) throw new Error("Please select your MAL XML export file.");
        setImportProgress("Parsing MAL XML file...");
        const content = await readFileContent(importFile);
        items = parseMALXml(content);
      } else if (importFrom === "File") {
        // File - parse JSON
        if (!importFile) throw new Error("Please select a JSON file to import.");
        setImportProgress("Parsing import file...");
        const content = await readFileContent(importFile);
        items = parseJsonFile(content);
      }

      if (items.length === 0) {
        throw new Error("No anime entries found. Check your username or file format.");
      }

      setImportProgress(`Found ${items.length} entries. Saving to watchlist (${importMode} mode)...`);

      // Send to backend
      const response = await backendApi.post("/watchlist/import", {
        items,
        mode: importMode
      });

      if (response.data.success) {
        setGlobalWatchlist(response.data.watchlist);
        const { added, updated, total } = response.data.stats;
        setImportResult({
          success: true,
          message: `✅ Import successful! ${added} added, ${updated} updated. Total: ${total} entries.`
        });
      } else {
        throw new Error(response.data.message || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        message: `❌ ${error.message || "Import failed. Please try again."}`
      });
    } finally {
      setIsImporting(false);
      setImportProgress("");
    }
  };

  // ─── Export Helpers ───
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMALXml = (list) => {
    let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n<myanimelist>\n';
    xml += '  <myinfo>\n';
    xml += `    <user_export_type>1</user_export_type>\n`;
    xml += '  </myinfo>\n';
    list.forEach((item) => {
      const statusMap = { "Watching": "Watching", "Completed": "Completed", "On-Hold": "On-Hold", "Dropped": "Dropped", "Planning": "Plan to Watch" };
      xml += '  <anime>\n';
      xml += `    <series_animedb_id>${item.animeId || 0}</series_animedb_id>\n`;
      xml += `    <series_title><![CDATA[${item.title || item.animeId}]]></series_title>\n`;
      xml += `    <my_watched_episodes>${item.progress || 0}</my_watched_episodes>\n`;
      xml += `    <my_score>${item.score || 0}</my_score>\n`;
      xml += `    <my_status>${statusMap[item.status] || "Plan to Watch"}</my_status>\n`;
      xml += '  </anime>\n';
    });
    xml += '</myanimelist>';
    return xml;
  };

  const handleExport = () => {
    setIsExporting(true);
    const list = globalWatchlist || [];

    if (exportFormat === "JSON") {
      downloadFile(JSON.stringify(list, null, 2), "anixo-watchlist.json", "application/json");
    } else if (exportFormat === "TEXT") {
      const statusGroups = {};
      list.forEach(item => {
        const s = item.status || "Other";
        if (!statusGroups[s]) statusGroups[s] = [];
        statusGroups[s].push(item);
      });
      let text = `AniXo Watchlist Export (${new Date().toLocaleDateString()})\n${"=".repeat(50)}\n\n`;
      Object.entries(statusGroups).forEach(([status, items]) => {
        text += `── ${status} (${items.length}) ──\n`;
        items.forEach((item, i) => {
          text += `  ${i + 1}. ${item.title || item.animeId}${item.score ? ` ★${item.score}` : ""}${item.progress ? ` [${item.progress} eps]` : ""}\n`;
        });
        text += "\n";
      });
      downloadFile(text, "anixo-watchlist.txt", "text/plain");
    } else if (exportFormat === "MAL XML") {
      downloadFile(generateMALXml(list), "anixo-watchlist.xml", "application/xml");
    }
    setIsExporting(false);
  };

  const navItems = [
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
    { id: "watching", label: "Continue Watching", icon: Clock, path: "/watching" },
    { id: "bookmarks", label: "Bookmarks", icon: Heart, path: "/watchlist" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
    { id: "import", label: "Import/Export", icon: Download, path: "/import" },
    { id: "settings", label: "Settings", icon: SettingsIcon, path: "/settings" }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <div className="max-w-[1200px] mx-auto w-full pt-[80px] px-4 pb-12 flex-1">

        {/* Top Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar bg-[#1a1a1a] mb-8 border border-white/5 rounded-sm shadow-xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col gap-2 min-w-[140px] flex-1 p-4 transition-colors relative group ${isActive ? "bg-[#222]" : "hover:bg-[#222]"}`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />}
                <Icon size={16} className={isActive ? "text-red-500" : "text-white/40 group-hover:text-white/80"} />
                <span className={`text-xs font-bold ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Import/Export Card */}
        <div className="max-w-[800px] mx-auto">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-md overflow-hidden shadow-2xl">

            {/* Import / Export Tabs */}
            <div className="flex items-center gap-0 p-5 pb-0">
              <button
                onClick={() => { setActiveTab("import"); setImportResult(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all rounded-[3px] ${
                  activeTab === "import" ? "bg-red-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <FileText size={14} />
                Import
              </button>
              <button
                onClick={() => { setActiveTab("export"); setImportResult(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all rounded-[3px] ${
                  activeTab === "export" ? "bg-red-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <FileText size={14} />
                Export
              </button>
            </div>

            {/* ═══ IMPORT TAB ═══ */}
            {activeTab === "import" && (
              <form onSubmit={handleImport} className="p-6 pt-5 space-y-6">
                <div className="space-y-1 text-[13px] text-white/40 leading-relaxed">
                  <p>- Your MAL / AL list must be in public status.</p>
                  <p>- Anime present in your list but not available in our library will not be imported.</p>
                  <p>- This process may take some time, so please be patient.</p>
                </div>

                {/* From */}
                <div className="flex items-center gap-8">
                  <span className="text-sm font-bold text-white/70 w-[120px] shrink-0">From</span>
                  <div className="flex items-center gap-6">
                    <Radio checked={importFrom === "MAL"} onChange={() => setImportFrom("MAL")} label="MAL" />
                    <Radio checked={importFrom === "AL"} onChange={() => setImportFrom("AL")} label="AL" />
                    <Radio checked={importFrom === "File"} onChange={() => setImportFrom("File")} label="File" />
                  </div>
                </div>

                {/* Username (for AL only) */}
                {importFrom === "AL" && (
                  <div className="flex items-center gap-8">
                    <span className="text-sm font-bold text-white/70 w-[120px] shrink-0">Username</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="AniList username"
                      className="flex-1 bg-[#111] border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-red-600/50 transition-colors"
                    />
                  </div>
                )}

                {/* File Upload (for MAL and File) */}
                {importFrom !== "AL" && (
                  <div className="flex items-center gap-8">
                    <span className="text-sm font-bold text-white/70 w-[120px] shrink-0">File</span>
                    <div className="flex-1">
                      <label className="flex items-center gap-0 cursor-pointer">
                        <span className="bg-[#333] text-white/70 text-sm font-medium px-4 py-2.5 border border-white/10 rounded-l-sm hover:bg-[#444] transition-colors">
                          Choose File
                        </span>
                        <span className="flex-1 bg-[#111] text-white/30 text-sm px-4 py-2.5 border border-l-0 border-white/10 rounded-r-sm truncate">
                          {importFile ? importFile.name : "No file chosen"}
                        </span>
                        <input
                          type="file"
                          accept={importFrom === "MAL" ? ".xml" : ".json,.txt"}
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-white/30 mt-2">
                        {importFrom === "MAL"
                          ? "Choose the XML file you downloaded from MAL."
                          : "Choose a previously exported JSON file."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mode */}
                <div className="flex items-center gap-8">
                  <span className="text-sm font-bold text-white/70 w-[120px] shrink-0">Mode</span>
                  <div className="flex items-center gap-6">
                    <Radio checked={importMode === "Merge"} onChange={() => setImportMode("Merge")} label="Merge" />
                    <Radio checked={importMode === "Replace"} onChange={() => setImportMode("Replace")} label="Replace" />
                  </div>
                </div>

                {/* Progress indicator */}
                {importProgress && (
                  <div className="flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded text-sm text-blue-400">
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    {importProgress}
                  </div>
                )}

                {/* Result Message */}
                {importResult && (
                  <div className={`p-4 rounded text-sm font-medium flex items-start gap-3 ${
                    importResult.success 
                      ? 'bg-green-600/10 text-green-400 border border-green-600/20' 
                      : 'bg-red-600/10 text-red-400 border border-red-600/20'
                  }`}>
                    {importResult.success ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
                    <span>{importResult.message}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-bold py-4 text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 rounded-sm"
                >
                  {isImporting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Upload size={16} />
                      Import
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ═══ EXPORT TAB ═══ */}
            {activeTab === "export" && (
              <div className="p-6 pt-5 space-y-6">
                <p className="text-[13px] text-white/40 leading-relaxed">
                  - Export your list to a file, allowing you to use it wherever you like.
                </p>

                <div className="flex items-center gap-8">
                  <span className="text-sm font-bold text-white/70 w-[120px] shrink-0">Format</span>
                  <div className="flex items-center gap-6">
                    <Radio checked={exportFormat === "TEXT"} onChange={() => setExportFormat("TEXT")} label="TEXT" />
                    <Radio checked={exportFormat === "JSON"} onChange={() => setExportFormat("JSON")} label="JSON" />
                    <Radio checked={exportFormat === "MAL XML"} onChange={() => setExportFormat("MAL XML")} label="MAL XML" />
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-bold py-4 text-sm uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 rounded-sm"
                >
                  {isExporting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Download size={16} />
                      Export
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
