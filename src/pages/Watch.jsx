import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getAnimeDetails, getEpisodeTitles, getJikanAnimeDetails, getAnikaiDetails, getSecondaryEpisodeMeta, getMalSyncMapping } from "../services/api";
import { resolveAnikaiMatch, scoreMetadata } from "../services/anikaiMapping";
import { useLanguage } from "../context/LanguageContext";
import { useLoading } from "../context/LoadingContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import AnimeCard from "../components/common/AnimeCard";
import NextEpisodeBanner from "../components/common/NextEpisodeBanner";
import VideoPlayer from "../components/common/VideoPlayer";
import { useAuth } from "../hooks/useAuth";
import { addToWatchlist, removeFromWatchlist, getWatchlist } from "../services/watchlistService";
import { updateProgress } from "../services/progressService";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Image,
  Play,
  SkipForward,
  SkipBack,
  Clock,
  BookmarkPlus,
  Flag,
  MessageSquare,
  Mic,
  Share2,
  Search,
  Maximize2,
  Zap,
  Activity,
  FastForward,
  MoreVertical,
  Plus,
  Moon,
  Sun,
  PlayCircle,
  Scissors,
  Timer,
  Heart,
  Star,
  Calendar,
  Frown,
  Smile,
  Sparkles,
  Meh,
  CheckCircle2,
  X,
  Quote,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Reply,
  MoreHorizontal,
  ChevronDown
} from "lucide-react";

// --- CUSTOM ANIWATCH-STYLE COMMENT COMPONENT ---
function CustomCommentSection({ animeId, episode, animeTitle, relations = [], recommendations = [] }) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("newest"); // "best" | "newest" | "oldest"
  const [commentText, setCommentText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const textareaRef = useRef(null);
  const API_BASE = (import.meta.env.VITE_PYTHON_API || "http://localhost:5000") + "/api";

  // Sorting Logic
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "best") {
      return (b.likes || 0) - (a.likes || 0);
    } else if (sortBy === "oldest") {
      return new Date(a.time) - new Date(b.time);
    } else {
      return new Date(b.time) - new Date(a.time); // newest
    }
  });

  const SidebarCard = ({ anime }) => (
    <Link to={`/watch/${anime.id}`} className="flex gap-3 p-2 rounded-[4px] hover:bg-white/[0.03] transition-all group border border-transparent hover:border-white/5 mb-3">
      <div className="w-16 h-20 shrink-0 rounded-[2px] overflow-hidden border border-white/10 bg-white/5">
        <img 
          src={anime.coverImage?.extraLarge || anime.coverImage?.large} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          alt="" 
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-[13px] font-bold text-white/90 line-clamp-1 mb-1 group-hover:text-red-500 transition-colors">
          {anime.title?.userPreferred || anime.title?.english || anime.title?.romaji}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
          <span>{anime.format || "TV"}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="flex items-center gap-1">
             <Star size={10} className="text-yellow-500" fill="currentColor" />
             {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "?"}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{anime.seasonYear || anime.startDate?.year || "?"}</span>
        </div>
      </div>
    </Link>
  );

  const insertFormatting = (type) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = commentText;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let newText = "";
    let cursorOffset = 0;

    if (type === 'bold') {
      newText = `${before}**${selection}**${after}`;
      cursorOffset = 2;
    } else if (type === 'quote') {
      newText = `${before}> ${selection}${after}`;
      cursorOffset = 2;
    } else if (type === 'spoiler') {
      newText = `${before}||${selection}||${after}`;
      cursorOffset = 2;
    }

    setCommentText(newText);
    
    setTimeout(() => {
      el.focus();
      const newPos = selection ? start + selection.length + (cursorOffset * 2) : start + cursorOffset;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Interactive Spoiler Component
  const CommentBody = ({ content }) => {
    if (!content) return null;

    // Split text into parts (Bold, Spoiler, Quote)
    const parts = content.split(/(\*\*.*?\*\*|\|\|.*?\|\||^> .*?$)/gm);

    return (
      <div className="text-[14px] text-white/80 leading-relaxed mb-4 font-medium">
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('||') && part.endsWith('||')) {
            return (
              <span 
                key={i} 
                onClick={(e) => e.currentTarget.classList.toggle('reveal-spoiler')}
                className="bg-white/10 text-transparent hover:bg-white/20 transition-all px-1.5 py-0.5 rounded cursor-pointer select-none reveal-on-click mx-0.5 inline-block"
              >
                {part.slice(2, -2)}
              </span>
            );
          }
          if (part.startsWith('> ')) {
            return (
              <div key={i} className="text-[13px] text-white/40 italic font-medium py-1 flex gap-1">
                <span className="text-white/10">“</span>
                <span>{part.slice(2)}</span>
                <span className="text-white/10">”</span>
              </div>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  // Helper to format text for Preview ONLY (Raw HTML)
  const formatPreview = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^> (.*?)$/gm, "<blockquote class='border-l-2 border-red-600/50 pl-3 my-2 text-white/40 italic'>$1</blockquote>")
      .replace(/\|\|(.*?)\|\|/g, "<span class='bg-white/10 text-white/40 px-1 rounded'>$1</span>");
  };

  // Helper to calculate relative time (Real Time)
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const now = new Date();
    const past = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(past.getTime())) return "Just now";
    
    const diffInMs = now - past;
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSecs < 60) return "Just now";
    if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    
    // For older than a week, show the date
    return past.toLocaleDateString();
  };

  // 1. Fetch comments on load or episode change
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const resp = await axios.get(`${API_BASE}/comments?animeId=${animeId}&episode=${episode}`);
        setComments(resp.data);
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComments();
  }, [animeId, episode, API_BASE]);

  const hasScrolledRef = useRef(false);

  // 2. Scroll to specific comment if ID is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('commentId');
    
    if (targetId && comments.length > 0 && !hasScrolledRef.current) {
      // Check if target comment exists in the current list
      const commentExists = comments.some(c => String(c.id) === String(targetId));
      if (!commentExists) return;

      setTimeout(() => {
        const element = document.getElementById(`comment-${targetId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-comment');
          hasScrolledRef.current = true; // Mark as done
          
          setTimeout(() => {
            element.classList.remove('highlight-comment');
          }, 10000);
        }
      }, 1500);
    }
  }, [comments]);

  // Sub-component for individual Comment Item
  const CommentItem = ({ comment }) => {
    const [showMore, setShowMore] = useState(false);
    const [localLikes, setLocalLikes] = useState(comment.likes || 0);
    const [localDislikes, setLocalDislikes] = useState(comment.dislikes || 0);
    const [isLiked, setIsLiked] = useState(comment.likedBy?.includes(user?.username) || false);
    const [isDisliked, setIsDisliked] = useState(comment.dislikedBy?.includes(user?.username) || false);

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(comment.content);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleted, setIsDeleted] = useState(comment.isDeleted || false);

    const handleInteraction = async (action) => {
      if (!user) {
        alert("Please login to interact with comments");
        return;
      }
      try {
        const resp = await axios.post(`${API_BASE}/comments/vote`, {
          animeId, episode, commentId: comment.id, action, username: user.username
        });
        if (resp.data.success) {
          setLocalLikes(resp.data.likes);
          setLocalDislikes(resp.data.dislikes);
          if (action === 'like') { setIsLiked(!isLiked); setIsDisliked(false); }
          else if (action === 'dislike') { setIsDisliked(!isDisliked); setIsLiked(false); }
        }
      } catch (err) { console.error("Voting failed", err); }
    };

    const handleMoreAction = async (type) => {
      setShowMore(false);
      if (type === 'report') {
        alert("Comment reported.");
      } else if (type === 'copy') {
        const baseUrl = window.location.href.split('?')[0];
        navigator.clipboard.writeText(`${baseUrl}?commentId=${comment.id}`);
        alert("Link copied!");
      } else if (type === 'delete') {
        if (window.confirm("Are you sure?")) {
          try {
            await axios.post(`${API_BASE}/comments/delete`, {
              animeId, episode, commentId: comment.id, username: user.username
            });
            setIsDeleted(true);
          } catch (err) { 
            console.error("Comment delete error:", err);
            alert("Failed to delete."); 
          }
        }
      } else if (type === 'edit') {
        setIsEditing(true);
      }
    };

    const handleUpdate = async () => {
      if (!editValue.trim() || isUpdating) return;
      try {
        setIsUpdating(true);
        await axios.post(`${API_BASE}/comments/edit`, {
          animeId, episode, commentId: comment.id, username: user.username, content: editValue
        });
        comment.content = editValue; 
        setIsEditing(false);
      } catch (err) { 
        console.error("Comment update error:", err);
        alert("Failed to update."); 
      }
      finally { setIsUpdating(false); }
    };

    const isOwner = user?.username === comment.user;

    return (
      <div id={`comment-${comment.id}`} className="flex gap-4 group p-3 rounded-lg transition-all duration-500 hover:bg-white/[0.01]">
        <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0 border border-white/10 overflow-hidden">
           <img 
             src={comment.avatar || `https://ui-avatars.com/api/?name=${comment.user}&background=random&color=fff`} 
             className="w-full h-full object-cover" 
             alt={comment.user} 
           />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <div className="text-[13px] font-bold text-white/90 hover:text-red-600 cursor-pointer transition-colors leading-none">{comment.user}</div>
            <div className="text-[11px] text-white/30 font-medium mt-1">{getRelativeTime(comment.time)}</div>
          </div>

          {isDeleted ? (
            <div className="text-[13px] text-white/30 italic font-medium py-1">
              This comment has been deleted.
            </div>
          ) : isEditing ? (
            <div className="bg-[#141519] border border-white/10 rounded p-3">
              <textarea 
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[14px] text-white/80 resize-none min-h-[60px]"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-2">
                <button onClick={() => setIsEditing(false)} className="text-[11px] text-white/30 hover:text-white uppercase font-medium">Cancel</button>
                <button onClick={handleUpdate} className="text-[11px] text-red-600 hover:text-red-500 uppercase font-bold">{isUpdating ? '...' : 'Save'}</button>
              </div>
            </div>
          ) : (
            <CommentBody content={comment.content} />
          )}

          {!isDeleted && (
            <div className="flex items-center gap-6 text-white/20 mt-3 relative">
              <button onClick={() => handleInteraction('like')} className={`flex items-center gap-1.5 transition-colors group/btn ${isLiked ? 'text-red-600' : 'hover:text-white'}`}>
                <ThumbsUp size={14} className={isLiked ? 'fill-red-600' : ''} /><span className="text-[12px] font-medium">{localLikes}</span>
              </button>
              <button onClick={() => handleInteraction('dislike')} className={`flex items-center gap-1.5 transition-colors group/btn ${isDisliked ? 'text-red-600' : 'hover:text-white'}`}>
                <ThumbsDown size={14} className={isDisliked ? 'fill-red-600' : ''} /><span className="text-[12px] font-medium">{localDislikes}</span>
              </button>
              <button onClick={() => handleInteraction('reply')} className="flex items-center gap-1.5 hover:text-white transition-colors group/btn">
                <Reply size={14} className="rotate-180" /><span className="text-[11px] font-medium">Reply</span>
              </button>
              
              <div className="relative">
                <button onClick={() => setShowMore(!showMore)} className={`flex items-center gap-1 hover:text-white transition-colors ${showMore ? 'text-white' : ''}`}>
                  <MoreHorizontal size={14} /><span className="text-[11px] font-medium">More</span>
                </button>
                
                {showMore && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}></div>
                    <div className="absolute left-0 bottom-full mb-2 w-36 bg-[#1a1c21] border border-white/10 rounded shadow-2xl z-50 overflow-hidden">
                      {isOwner ? (
                        <>
                          <button onClick={() => handleMoreAction('edit')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">Edit</button>
                          <button onClick={() => handleMoreAction('delete')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-red-600/70 hover:text-red-600 hover:bg-white/5 transition-colors uppercase tracking-wider border-t border-white/5">Delete</button>
                        </>
                      ) : (
                        <button onClick={() => handleMoreAction('report')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider">Report</button>
                      )}
                      <button onClick={() => handleMoreAction('copy')} className="w-full text-left px-4 py-2 text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider border-t border-white/5">Copy Link</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. Post a new comment
  const handlePostComment = async () => {
    if (!commentText.trim() || isSending || !user) return;
    
    try {
      setIsSending(true);
      const payload = {
        animeId,
        episode,
        user: user?.username || "Anonymous",
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'A'}&background=random&color=fff`,
        content: commentText
      };
      
      const resp = await axios.post(`${API_BASE}/comments`, payload);
      setComments([resp.data, ...comments]);
      setCommentText("");
      setIsFocused(false);
      setShowPreview(false);
    } catch (err) {
      console.error("Comment posting error:", err);
      alert("Backend error. Check if index.py is running.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-10 md:mt-16 select-none max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* LEFT COLUMN: COMMENTS (Wider Breadth) */}
        <div className="flex-1">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-[20px] font-bold text-white tracking-tight uppercase leading-none">
                COMMENTS {animeTitle && <span className="font-normal opacity-50">— {animeTitle}</span>}
              </h2>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MessageSquare size={13} className="text-white/20" />
                <span className="text-[12px] text-white/20 font-bold uppercase tracking-widest">{comments.length} comments</span>
              </div>
            </div>
            <div className="flex items-center gap-5 text-[12px] font-bold text-white/40 uppercase tracking-tight">
              <button 
                onClick={() => setSortBy("best")} 
                className={`transition-colors ${sortBy === 'best' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
              >
                Best
              </button>
              <button 
                onClick={() => setSortBy("newest")} 
                className={`transition-colors ${sortBy === 'newest' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
              >
                Newest
              </button>
              <button 
                onClick={() => setSortBy("oldest")} 
                className={`transition-colors ${sortBy === 'oldest' ? 'text-white border-b-2 border-red-600 pb-1' : 'hover:text-white'}`}
              >
                Oldest
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-10">
            <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'G'}&background=random&color=fff`} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 bg-[#1a1c21] rounded-[4px] overflow-hidden border border-white/5 focus-within:border-white/10 transition-all duration-200 ease-out">
              <div className="py-1.5 px-3">
                {showPreview ? (
                  <div 
                    className="w-full text-[14px] text-white/80 min-h-[26px] overflow-auto prose prose-invert"
                    dangerouslySetInnerHTML={{ __html: formatPreview(commentText) || "<span class='text-white/10 italic'>Nothing to preview..</span>" }}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Write your comment.."
                    disabled={!user}
                    className={`w-full bg-transparent border-none outline-none text-[14px] text-white/80 placeholder:text-white/10 transition-all duration-200 ease-out resize-none ${isFocused ? 'min-h-[75px] mt-1' : 'min-h-[26px]'}`}
                  />
                )}
              </div>
              
              {/* Snappy Expandable Footer */}
              <div className={`bg-white/[0.02] flex items-center justify-between px-4 border-t border-white/5 transition-all duration-200 ease-in-out overflow-hidden ${isFocused || commentText ? 'max-h-20 py-2 opacity-100 visible' : 'max-h-0 py-0 opacity-0 invisible border-none'}`}>
                <div className="flex items-center gap-6 text-white/30">
                  <button onClick={() => insertFormatting('bold')} className="hover:text-white transition-colors font-bold text-[14px]">B</button>
                  <button onClick={() => insertFormatting('quote')} className="hover:text-white transition-colors"><Quote size={15} /></button>
                  <button onClick={() => insertFormatting('spoiler')} className="hover:text-white transition-colors"><EyeOff size={15} /></button>
                  <button onClick={() => setShowPreview(!showPreview)} className={`transition-colors ${showPreview ? 'text-red-500' : 'hover:text-white'}`}><Eye size={15} /></button>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => {setCommentText(""); setIsFocused(false); setShowPreview(false);}} className="text-[12px] font-bold text-white/30 hover:text-white uppercase px-2">Cancel</button>
                  <button 
                    onClick={handlePostComment} 
                    disabled={!commentText.trim() || isSending} 
                    className="bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold px-6 py-2 rounded transition-all uppercase disabled:opacity-40 active:scale-95"
                  >
                    {isSending ? "..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {isLoading ? (
              <div className="py-10 text-center text-white/10 animate-pulse text-[11px] font-bold uppercase tracking-widest">Loading...</div>
            ) : sortedComments.length > 0 ? (
              sortedComments.map((comment) => <CommentItem key={comment.id} comment={comment} />)
            ) : (
              <div className="py-20 text-center">
                <MessageSquare size={40} className="mx-auto text-white/5 mb-4" />
                <p className="text-white/10 text-[11px] font-bold uppercase tracking-widest">No comments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR (25%) */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-10">
          
          {/* RELATED SECTION */}
          {relations.length > 0 && (
            <div className="animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[16px] font-bold text-white uppercase tracking-wider">RELATED</h3>
                <button className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-[2px] uppercase">
                  All <ChevronDown size={12} />
                </button>
              </div>
              <div className="bg-[#0f0f0f] border border-white/5 p-1 rounded-[2px]">
                {relations.slice(0, 3).map((anime) => (
                  <SidebarCard key={anime.id} anime={anime} />
                ))}
              </div>
            </div>
          )}

          {/* RECOMMENDED SECTION */}
          {recommendations.length > 0 && (
            <div className="animate-in slide-in-from-right-6 duration-700">
              <h3 className="text-[16px] font-bold text-white uppercase tracking-wider mb-6">RECOMMENDED</h3>
              <div className="space-y-1">
                {recommendations.slice(0, 6).map((anime) => (
                  <SidebarCard key={anime.id} anime={anime} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isMal = queryParams.get("mal") === "true";
  const initialEp = parseInt(queryParams.get("ep")) || 1;
  const initialTime = parseFloat(queryParams.get("t")) || 0;

  const { getTitle } = useLanguage();
  const { setPageLoading } = useLoading();

  const [activeEpisode, setActiveEpisode] = useState(initialEp);
  const [addingAction, setAddingAction] = useState(false);
  const [episodeLayout, setEpisodeLayout] = useState("list"); // "grid" | "list" | "detailed"
  const [playerLang, setPlayerLang] = useState("sub");
  const [activeServer, setActiveServer] = useState(1);
  const [fakeLoading, setFakeLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing secure stream...");

  // Watchlist integration
  const { user, setGlobalWatchlist, setGlobalProgress, globalSettings } = useAuth();
  const [backendWatchlist, setBackendWatchlist] = useState([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);

  useEffect(() => {
    if (user) {
      getWatchlist().then(res => {
        if (res.success) {
          setBackendWatchlist(res.watchlist);
        }
      });
    }
  }, [user]);

  const isBookmarked = backendWatchlist.some(item => item.animeId === String(id));

  // Safe localStorage helper
  const getSafeStorage = (key, defaultVal) => {
    try {
      const val = localStorage.getItem(key);
      if (!val) return defaultVal;
      return JSON.parse(val);
    } catch (err) {
      console.warn(`[Storage] Failed to parse key "${key}". Resetting to default.`, err);
      return defaultVal;
    }
  };

  // Persisted settings
  const [autoNext, setAutoNext] = useState(() => getSafeStorage("autoNext", true));
  const [autoPlay, setAutoPlay] = useState(() => getSafeStorage("autoPlay", true));
  const [autoSkip, setAutoSkip] = useState(() => getSafeStorage("autoSkip", false));

  const [episodePage, setEpisodePage] = useState(0);
  const [hasSub, setHasSub] = useState(false); // Strict: Hide until verified
  const [hasDub, setHasDub] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [isEpisodeSearchOpen, setIsEpisodeSearchOpen] = useState(false);

  // Sync Focus Mode to Body class for global styling overrides
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("focus-mode");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.classList.remove("focus-mode");
    }
    return () => document.body.classList.remove("focus-mode");
  }, [isFocusMode]);

  // Performance: In-memory caches
  const streamCache = useRef(new Map());

  // Modal states
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [userRating, setUserRating] = useState(() => getSafeStorage(`rating_${id}`, null));
  const [skipTimes, setSkipTimes] = useState(() => getSafeStorage(`skipTimes_${id}`, {}));

  // Sync settings to localStorage
  useEffect(() => localStorage.setItem("autoNext", JSON.stringify(autoNext)), [autoNext]);
  useEffect(() => localStorage.setItem("autoPlay", JSON.stringify(autoPlay)), [autoPlay]);
  useEffect(() => localStorage.setItem("autoSkip", JSON.stringify(autoSkip)), [autoSkip]);
  useEffect(() => localStorage.setItem(`skipTimes_${id}`, JSON.stringify(skipTimes)), [skipTimes, id]);
  useEffect(() => {
    if (userRating) {
      localStorage.setItem(`rating_${id}`, JSON.stringify(userRating));
    }
  }, [userRating, id]);

  // Handle J/L key skipping based on user settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in a search box or input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const skipVal = globalSettings?.skipSeconds || 5;
      
      if (e.key.toLowerCase() === 'l') {
        // Skip Forward
        window.postMessage({ event: "skip", amount: skipVal }, "*");
      } else if (e.key.toLowerCase() === 'j') {
        // Skip Backward
        window.postMessage({ event: "skip", amount: -skipVal }, "*");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalSettings]);

  const EPISODES_PER_PAGE = 50;
  const GOGO_SLUG_OVERRIDES = {};

  // Sync with global settings
  useEffect(() => {
    if (globalSettings) {
      if (globalSettings.videoLanguage === 'Dub') {
        setPlayerLang('dub');
      } else if (globalSettings.videoLanguage === 'Soft Sub' || globalSettings.videoLanguage === 'Hard Sub') {
        setPlayerLang('sub');
      }
      
      if (globalSettings.autoPlay !== undefined) setAutoPlay(globalSettings.autoPlay);
      if (globalSettings.autoNext !== undefined) setAutoNext(globalSettings.autoNext);
    }
  }, [globalSettings]);

  // Reset active episode and page when navigating to a different anime/season
  useEffect(() => {
    setActiveEpisode(1);
    setEpisodePage(0);
  }, [id]);

  // Auto-jump to the correct page when active episode changes
  useEffect(() => {
    const targetPage = Math.floor((activeEpisode - 1) / EPISODES_PER_PAGE);
    setEpisodePage(targetPage);
  }, [activeEpisode]);

  // API Endpoints
  const PYTHON_API = import.meta.env.VITE_PYTHON_API || "";
  const [streamUrl, setStreamUrl] = useState("");
  const [streamData, setStreamData] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const [anikaiEpisodes, setAnikaiEpisodes] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // Sync global page loader with iframe loading
  useEffect(() => {
    if (iframeLoaded || fetchError || (streamUrl && streamData && !streamData.iframe_url && !streamLoading)) {
      setPageLoading(false);
    }
  }, [iframeLoaded, fetchError, streamUrl, streamData, streamLoading, setPageLoading]);

  // Clean up loading state on unmount
  useEffect(() => {
    return () => setPageLoading(false);
  }, [setPageLoading]);

  // Reset iframe loading state whenever the URL changes
  useEffect(() => {
    if (streamUrl) {
      setIframeLoaded(false);
    } else {
      setIframeLoaded(true);
    }
  }, [streamUrl]);

  // ── FAKE LOADING LOGIC ──
  useEffect(() => {
    setFakeLoading(true);
    const messages = [
      "Connecting to high-speed nodes...",
      "Optimizing video buffer...",
      "Bypassing geo-restrictions...",
      "Establishing secure tunnel...",
      "Preparing your stream..."
    ];
    
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex++;
      if (messages[msgIndex]) setLoadingMessage(messages[msgIndex]);
    }, 700);

    const timer = setTimeout(() => {
      setFakeLoading(false);
      clearInterval(msgInterval);
    }, 3500); // 3.5 seconds of fake loading time

    return () => {
      clearTimeout(timer);
      clearInterval(msgInterval);
    };
  }, [activeEpisode, id]); // Trigger on episode or anime change

  const { data: anime, isLoading } = useQuery({
    queryKey: ["animeDetails", id, isMal],
    queryFn: () => getAnimeDetails(id, isMal),
    enabled: !!id,
    staleTime: 0,
  });

  // URL Cleanup: If we arrived via a slug, redirect to the AniList ID once loaded
  useEffect(() => {
    if (anime && anime.id && isNaN(id) && !isMal) {
      console.log(`[Watch] Cleaning up URL: ${id} -> ${anime.id}`);
      const params = new URLSearchParams(location.search);
      // Ensure we keep existing query params like ep and t
      navigate({
        pathname: `/watch/${anime.id}`,
        search: params.toString()
      }, { replace: true });
    }
  }, [anime, id, isMal, navigate, location.search]);

  // ── PROGRESS: Save to backend when episode changes (ensures history is ALWAYS tracked) ──
  // 5-second delay to avoid junk entries from accidental clicks
  const progressSavedForEp = useRef(null);
  useEffect(() => {
    if (!user || !anime || !id) return;

    // Only save once per episode visit to avoid spamming
    const epKey = `${id}-${activeEpisode}`;
    if (progressSavedForEp.current === epKey) return;

    const timer = setTimeout(() => {
      progressSavedForEp.current = epKey;

      const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
      const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown';

      updateProgress(String(id), activeEpisode, 0, null, title, coverImg)
        .then(res => {
          if (res.success && res.progress) {
            setGlobalProgress(prev => {
              const filtered = prev.filter(p => p.animeId !== String(id));
              return [res.progress, ...filtered].slice(0, 100);
            });
          }
        })
        .catch(err => console.warn("Initial progress save failed:", err));
    }, 5000); // 5 second delay

    return () => clearTimeout(timer);
  }, [user, anime, id, activeEpisode, setGlobalProgress]);

  // ── PROGRESS: Save on page leave / tab close ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user || !anime || !id) return;
      const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
      const title = anime?.title?.english || anime?.title?.romaji || anime?.title?.native || 'Unknown';

      const token = localStorage.getItem('token');
      if (!token) return;

      const payload = JSON.stringify({
        animeId: String(id),
        episode: activeEpisode,
        currentTime: 0,
        duration: null,
        title,
        coverImage: coverImg
      });

      try {
        fetch('/progress/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true
        });
      } catch {
        // Silently fail — page is closing anyway
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, anime, id, activeEpisode]);



  // 1. Compute Relations (Sequels/Prequels/Related)
  const relations = useMemo(() => {
    if (!anime) return [];
    return (anime.relations?.edges || [])
      .filter(edge => edge.node?.type === 'ANIME')
      .map(edge => edge.node)
      .filter(item => item && Number(item.id) !== Number(id))
      .slice(0, 12);
  }, [anime, id]);

  // 2. Compute Recommendations (You May Also Like)
  const recommendations = useMemo(() => {
    if (!anime) return [];
    return (anime.recommendations?.nodes || [])
      .map(node => node.mediaRecommendation)
      .filter(item => item && Number(item.id) !== Number(id))
      .slice(0, 24);
  }, [anime, id]);

  // Verification logic for SUB/DUB sources (Strict Validation & Optimized)
  useEffect(() => {
    if (!activeEpisode || !anikaiEpisodes.length) {
      setHasSub(false);
      setHasDub(false);
      return;
    }

    let cancelled = false;

    // Reset states immediately on episode change to prevent stale UI
    setHasSub(false);
    setHasDub(false);

    const verifySources = async () => {
      const ep = anikaiEpisodes.find(e => String(e.number) === String(activeEpisode));
      if (!ep) return;

      const token = ep.id;

      const checkLang = async (lang) => {
        const cacheKey = `${token}-${lang}`;
        // 1. Check cache first
        if (streamCache.current.has(cacheKey)) {
          const data = streamCache.current.get(cacheKey);
          const hasContent = (Array.isArray(data?.sources) && data.sources.length > 0) || data?.iframe_url;
          return hasContent && data?.lang === lang;
        }
        // 2. Fetch if not cached
        try {
          const resp = await axios.get(`${PYTHON_API}/api/anikai/stream/${token}`, {
            params: { lang, strict: true }
          });
          const data = resp.data;
          // RELAXED VALIDATION: Must have either sources array OR an iframe_url
          const hasContent = (Array.isArray(data.sources) && data.sources.length > 0) || data.iframe_url;
          const isValid = data?.success && hasContent && data.lang === lang;
          if (isValid) {
            streamCache.current.set(cacheKey, data);
            return true;
          }
        } catch (err) {
          console.warn(`[Source Verification] ${lang.toUpperCase()} fetch failed:`, err.message);
        }
        return false;
      };

      // Parallel Fetch: Request both but update state as soon as each resolves
      const [subAvailable, dubAvailable] = await Promise.all([
        checkLang('sub'),
        checkLang('dub')
      ]);

      if (cancelled) return;

      console.info(`[Source Verification] Ep ${activeEpisode} Result: SUB=${subAvailable}, DUB=${dubAvailable}`);

      setHasSub(subAvailable);
      setHasDub(dubAvailable);

      // Auto-fallback logic:
      // 1. If current lang is DUB but not available, switch to SUB if SUB exists
      if (playerLang === "dub" && !dubAvailable && subAvailable) {
        setPlayerLang("sub");
      }
      // 2. If current lang is SUB but not available, switch to DUB if DUB exists
      else if (playerLang === "sub" && !subAvailable && dubAvailable) {
        setPlayerLang("dub");
      }
    };

    verifySources();
    return () => { cancelled = true; };
  }, [activeEpisode, anikaiEpisodes, PYTHON_API, playerLang]);

  // MAL Episode Titles (lightweight — only for episode names)
  const { data: malEpisodes } = useQuery({
    queryKey: ["malEpisodes", anime?.idMal],
    queryFn: () => getEpisodeTitles(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // MALSync Mapping for precise external IDs (Kitsu, etc)
  const { data: malsyncMapping } = useQuery({
    queryKey: ["malsyncMapping", anime?.idMal],
    queryFn: () => getMalSyncMapping(anime?.idMal),
    enabled: !!anime?.idMal,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const kitsuIdFromMapping = malsyncMapping?.Sites?.Kitsu ? Object.keys(malsyncMapping.Sites.Kitsu)[0] : null;

  const kitsuTitle = anime?.title?.english;
  const kitsuAltTitle = anime?.title?.romaji;
  const { data: kitsuEpisodes } = useQuery({
    queryKey: ["kitsuEpisodes", kitsuTitle, kitsuAltTitle, kitsuIdFromMapping],
    queryFn: () => getSecondaryEpisodeMeta(kitsuTitle, kitsuAltTitle, kitsuIdFromMapping),
    enabled: !!kitsuTitle || !!kitsuAltTitle || !!kitsuIdFromMapping,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // 🚀 Multi-level detail fetching (Anikai > Jikan > Anilist) 🚀
  const searchTitle = anime?.title?.english || anime?.title?.romaji || anime?.title?.native;

  const { data: anikaiDetails } = useQuery({
    queryKey: ["anikaiDetails", searchTitle],
    queryFn: () => getAnikaiDetails(searchTitle),
    enabled: !!searchTitle,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const { data: jikanDetails } = useQuery({
    queryKey: ["jikanDetails", anime?.idMal],
    queryFn: () => getJikanAnimeDetails(anime?.idMal),
    enabled: !!anime?.idMal && !anikaiDetails,
    staleTime: 1000 * 60 * 60 * 24,
  });

  // Unified priority resolver: Anikai > Jikan > Anilist
  const resolvedInfo = useMemo(() => {
    const get = (field, ...fallbacks) => {
      const sources = [anikaiDetails];
      for (const src of sources) {
        if (src?.[field]) return src[field];
      }
      // Jikan uses different keys, handle mapping
      const jikanMap = {
        description: jikanDetails?.synopsis,
        country: jikanDetails?.demographics?.[0]?.name ? 'Japan' : null,
        premiered: jikanDetails?.season && jikanDetails?.year ? `${jikanDetails.season} ${jikanDetails.year}` : null,
        aired: jikanDetails?.aired?.string,
        broadcast: jikanDetails?.broadcast?.string,
        episodes: jikanDetails?.episodes?.toString(),
        duration: jikanDetails?.duration,
        status: jikanDetails?.status,
        mal_score: jikanDetails?.score?.toString(),
        studios: jikanDetails?.studios?.map(s => s.name).join(", "),
        producers: jikanDetails?.producers?.map(p => p.name).join(", "),
        genres: jikanDetails?.genres?.map(g => g.name),
        rating: jikanDetails?.rating?.split(" - ")[0],
      };
      if (jikanMap[field]) return jikanMap[field];
      // Final fallback values
      for (const fb of fallbacks) {
        if (fb) return fb;
      }
      return null;
    };
    if (!anime) return {};
    return {
      description: get("description", anime.description),
      country: get("country", anime.countryOfOrigin === 'JP' ? 'Japan' : anime.countryOfOrigin),
      premiered: get("premiered", anime.seasonYear ? `${anime.season?.toLowerCase() || ''} ${anime.seasonYear}` : null),
      aired: get("aired", anime.startDate ? `${anime.startDate.month ? new Date(anime.startDate.year, anime.startDate.month - 1).toLocaleString('default', { month: 'short' }) : '?'} ${anime.startDate.day || '?'}, ${anime.startDate.year}` : null),
      broadcast: get("broadcast"),
      episodes: get("episodes", anime.episodes?.toString()),
      duration: get("duration", anime.duration ? `${anime.duration} min` : null),
      status: get("status", anime.status?.replace(/_/g, ' ')?.toLowerCase()),
      mal_score: get("mal_score", anime.averageScore ? `${(anime.averageScore / 10).toFixed(2)}` : null),
      studios: get("studios", anime.studios?.nodes?.filter(s => s.isAnimationStudio)[0]?.name),
      producers: get("producers", anime.studios?.nodes?.filter(s => !s.isAnimationStudio).map(s => s.name).join(", ")),
      genres: get("genres", anime.genres),
      rating: get("rating"),
    };
  }, [anime, anikaiDetails, jikanDetails]);

  // Resolve current episode image for player background/loading placeholder
  const currentEpisodeImage = useMemo(() => {
    if (!anime) return null;
    const epData = malEpisodes?.find(e => e.mal_id === activeEpisode);
    const aniListEp = anime?.streamingEpisodes?.find(
      se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === activeEpisode
    ) || anime?.streamingEpisodes?.[activeEpisode - 1];

    // Priority:
    // 1. Kitsu (Best for unique screenshots)
    // 2. AniList Thumbnail (If not placeholder)
    // 3. Jikan / MAL
    // 4. Fallback to Anime Banner
    return (kitsuEpisodes?.[activeEpisode]?.image || kitsuEpisodes?.[String(activeEpisode)]?.image) ||
      aniListEp?.thumbnail ||
      epData?.images?.jpg?.image_url ||
      anime?.bannerImage ||
      anime?.coverImage?.extraLarge ||
      anime?.coverImage?.large;
  }, [anime, malEpisodes, activeEpisode, kitsuEpisodes]);


  useEffect(() => {
    const searchTitle = anime?.title?.english || anime?.title?.romaji || anime?.title?.native;
    if (!searchTitle) { setAnikaiEpisodes([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const searchResp = await axios.get(`${PYTHON_API}/api/anikai/search`, {
          params: { keyword: searchTitle },
        });
        if (cancelled) return;
        const results = searchResp.data?.results || [];
        if (!searchResp.data?.success || results.length === 0) {
          setAnikaiEpisodes([]);
          return;
        }
        const candidates = resolveAnikaiMatch(results, anime, playerLang);
        if (candidates.length === 0) {
          setAnikaiEpisodes([]);
          return;
        }

        // DEEP VERIFICATION: Fetch info for top candidates in parallel
        console.group(`[Mapping] Deep Resolving: ${anime.title?.english || id}`);
        const infoPromises = candidates.map(c =>
          axios.get(`${PYTHON_API}/api/anikai/info/${c.slug}`)
            .then(res => ({ ...c, info: res.data }))
            .catch(() => ({ ...c, info: null }))
        );

        const verificationResults = await Promise.all(infoPromises);
        if (cancelled) {
          console.groupEnd();
          return;
        }

        const finalScored = verificationResults.map(v => {
          const metaScore = v.info?.success ? scoreMetadata(anime, v.info) : 0;
          return { ...v, totalScore: (v.score || 0) + metaScore };
        });

        finalScored.sort((a, b) => b.totalScore - a.totalScore);
        const best = finalScored[0];

        // Log detailed scoring for transparency
        console.table(finalScored.map(f => ({
          Title: f.title,
          Initial: f.score,
          MetaBonus: f.totalScore - f.score,
          Total: f.totalScore,
          Year: f.info?.year,
          Eps: f.info?.episodes?.length
        })));
        console.groupEnd();

        const resolvedSlug = best.slug;
        const aniId = best.info?.ani_id;
        
        console.info(`[Anikai] Resolving episodes for: ${best.title} (ID: ${aniId}, Slug: ${resolvedSlug})`);

        if (!best.info?.success || !aniId) {
          setAnikaiEpisodes([]);
          return;
        }
        const epsResp = await axios.get(`${PYTHON_API}/api/anikai/episodes/${aniId}`);
        if (cancelled) return;
        if (epsResp.data?.success && Array.isArray(epsResp.data.episodes)) {
          setAnikaiEpisodes(epsResp.data.episodes);
          console.log("[Anikai] Final Result Loaded: %d episodes", epsResp.data.episodes.length);
        } else {
          setAnikaiEpisodes([]);
        }
      } catch (err) {
        console.error("Anikai deep resolve error:", err);
        if (!cancelled) setAnikaiEpisodes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [anime, id, PYTHON_API, playerLang]);


  const episodesList = useMemo(() => {
    if (!anime) return [];
    let count = anime.episodes;
    // If the anime is still airing and we have nextAiringEpisode
    if (anime.nextAiringEpisode) {
      count = Math.max(1, anime.nextAiringEpisode.episode - 1);
    }
    // For airing anime: use streamingEpisodes count as fallback
    if (!count && anime.status === 'RELEASING' && anime.streamingEpisodes?.length) {
      count = anime.streamingEpisodes.length;
    }
    if (!count) count = 12; // fallback if entirely unknown
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [anime]);

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery) return episodesList;
    const query = episodeSearchQuery.toLowerCase().trim();
    return episodesList.filter(ep => {
      const epStr = String(ep);
      const kitsuData = kitsuEpisodes?.[ep] || kitsuEpisodes?.[epStr];
      const jikanData = malEpisodes?.find(e => e.mal_id === ep);

      const title = (jikanData?.title || kitsuData?.title || "").toLowerCase();
      return epStr.includes(query) || title.includes(query);
    });
  }, [episodesList, episodeSearchQuery, kitsuEpisodes, malEpisodes]);

  // Clamp episodePage when filteredEpisodes changes (e.g. searching)
  useEffect(() => {
    const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
    if (episodePage >= totalPages && totalPages > 0) {
      setEpisodePage(totalPages - 1);
    } else if (filteredEpisodes.length === 0 && episodePage !== 0) {
      setEpisodePage(0);
    }
  }, [filteredEpisodes, episodePage, EPISODES_PER_PAGE]);

  const [stableSeasons, setStableSeasons] = useState([]);

  useEffect(() => {
    if (!anime) return;

    setStableSeasons(prev => {
      const isAlreadyInList = prev.some(s => s.id === anime.id || s.slug === anime.slug);

      if (isAlreadyInList) {
        return prev.map(s => ({
          ...s,
          isActive: (s.id === anime.id || s.slug === (anikaiDetails?.slug || anime.slug))
        }));
      }

      // Priority: Anikai Seasons (more accurate for the scraper)
      if (anikaiDetails?.seasons && anikaiDetails.seasons.length > 0) {
        return anikaiDetails.seasons.map(s => ({
          id: s.slug,
          slug: s.slug,
          title: {
            english: s.title,
            romaji: s.title
          },
          coverImage: {
            large: s.poster || anime.coverImage?.large,
            medium: s.poster || anime.coverImage?.medium
          },
          episodes: parseInt(s.episodes) || 0,
          format: "TV",
          isActive: s.isActive,
          relationToMain: s.isActive ? 'CURRENT' : 'ALTERNATIVE'
        }));
      }

      // Fallback: AniList Relations
      const items = [{
        ...anime,
        isActive: true,
        relationToMain: 'CURRENT'
      }];

      if (anime.relations?.edges) {
        anime.relations.edges.forEach(edge => {
          if (["TV"].includes(edge.node?.format)) {
            items.push({
              ...edge.node,
              isActive: false,
              relationToMain: edge.relationType
            });
          }
        });
      }

      const uniqueMap = new Map();
      items.forEach(item => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        } else {
          if (item.isActive) {
            const existing = uniqueMap.get(item.id);
            existing.isActive = true;
            existing.relationToMain = 'CURRENT';
            uniqueMap.set(item.id, existing);
          }
        }
      });

      const uniqueItems = Array.from(uniqueMap.values());

      uniqueItems.sort((a, b) => {
        const aMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(a.relationToMain) || (!a.relationToMain && ['TV'].includes(a.format)) ? 0 : 1;
        const bMain = ['PREQUEL', 'SEQUEL', 'PARENT', 'CURRENT'].includes(b.relationToMain) || (!b.relationToMain && ['TV'].includes(b.format)) ? 0 : 1;

        if (aMain !== bMain) return aMain - bMain;

        const aY = a.startDate?.year || 9999;
        const bY = b.startDate?.year || 9999;
        if (aY !== bY) return aY - bY;
        const aM = a.startDate?.month || 12;
        const bM = b.startDate?.month || 12;
        if (aM !== bM) return aM - bM;
        const aD = a.startDate?.day || 31;
        const bD = b.startDate?.day || 31;
        return aD - bD;
      });

      return uniqueItems;
    });
  }, [anime, anikaiDetails]);

  const getSeasonLabel = (item) => {
    if (!item) return "Current";

    const title = item.title?.english || item.title?.romaji || "";

    // 1. Explicit indicators in title
    const sMatch = title.match(/(?:Season|S)\s*(\d+)/i) || title.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
    const pMatch = title.match(/(?:Part)\s*(\d+)/i);
    if (sMatch && pMatch) return `S${sMatch[1]} P${pMatch[1]}`;
    if (sMatch) return `Season ${sMatch[1]}`;
    if (pMatch) return `Part ${pMatch[1]}`;

    // 2. Based on Relation Type
    if (item.relationToMain === 'SPIN_OFF') return 'Spin-off';
    if (item.relationToMain === 'SIDE_STORY') return 'Side Story';
    if (item.relationToMain === 'ALTERNATIVE') return 'Alternative';
    if (item.relationToMain === 'SUMMARY') return 'Recap';

    // 3. Based on Format
    if (item.format === 'MOVIE') return 'Movie';
    if (item.format === 'OVA') return 'OVA';
    if (item.format === 'ONA') return 'ONA';
    if (item.format === 'SPECIAL') return 'Special';

    // 4. Extract subtitle if colon exists
    const parts = title.split(":");
    if (parts.length > 1) {
      const subtitle = parts[parts.length - 1].trim();
      if (subtitle.length > 1) return subtitle;
    }

    // 5. Ultimate fallback
    return title;
  };



  const handleUpdateStatus = async (status) => {
    if (!user) return alert("Please login to manage your list");
    
    setIsWatchlistLoading(true);
    const coverImg = anime.coverImage?.large || anime.coverImage?.extraLarge;
    const res = await addToWatchlist(String(id), getTitle(anime.title), coverImg, status);
    
    if (res.success) {
      setBackendWatchlist(res.watchlist);
      setAddingAction(false);
      // Update global context too if needed
      if (typeof setGlobalWatchlist === 'function') {
        setGlobalWatchlist(res.watchlist);
      }
    }
    setIsWatchlistLoading(false);
  };

  const handleToggleBackendWatchlist = async () => {
    if (!user) return alert("Please login to add to watchlist");
    // Always open the status selector dropdown so user can pick 'Watching', 'On-Hold', etc.
    setAddingAction(!addingAction);
  };



  const lastAutoNextTime = useRef(0);
  const autoNextRef = useRef(autoNext);
  useEffect(() => { autoNextRef.current = autoNext; }, [autoNext]);

  // Go to the next episode
  const goNextEpisode = useCallback(() => {
    const now = Date.now();
    if (now - lastAutoNextTime.current < 3000) return;
    lastAutoNextTime.current = now;

    setActiveEpisode(prev => {
      const next = prev + 1;
      if (next <= episodesList.length) {
        return next;
      }
      return prev;
    });
  }, [episodesList.length]);

  const goPrevEpisode = useCallback(() => {
    setActiveEpisode(prev => Math.max(1, prev - 1));
  }, []);

  const iframeRef = useRef(null);
  const lastProgressSync = useRef(0);

  // ── Megaplay Player Events Listener ──
  useEffect(() => {
    const handleMessage = (event) => {
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {
          // Handle raw string events like "ended" or "complete"
          if (data === "ended" || data === "video_ended" || data === "complete") {
            if (autoNextRef.current) goNextEpisode();
          }
          return;
        }
      }

      if (!data) return;

      // 1. Handle Episode Completion (AutoNext)
      const isComplete =
        data.event === "complete" ||
        data.event === "onComplete" ||
        data.event === "ended" ||
        data.event === "finish" ||
        data.type === "complete" ||
        data.type === "ended" ||
        data.status === "completed" ||
        data.status === "finished" ||
        (data.event === "state" && data.data === "completed") ||
        data.message === "ended";

      if (isComplete) {
        if (autoNextRef.current) {
          console.info("[Player] Video ended, moving to next episode...");
          goNextEpisode();
        }
      }

      // 2. Handle AutoSkip Logic (Intro/Outro)
      if (autoSkip && skipTimes[activeEpisode]) {
        // Handle various time update formats from different players
        const currentTime = data.currentTime || data.time || data.seconds || data.progress?.seconds;
        const { start, end } = skipTimes[activeEpisode];

        if (typeof currentTime === 'number' && currentTime >= Number(start) && currentTime < Number(end)) {
          console.info(`[AutoSkip] Skipping intro: ${start}s -> ${end}s`);
          // Send seek message to iframe
          if (iframeRef.current?.contentWindow) {
            // Megaplay / Consumet Standard
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [Number(end)] }),
              "*"
            );
            // Alternative Standard
            iframeRef.current.contentWindow.postMessage(
              { type: "seek", time: Number(end) },
              "*"
            );
          }
        }
      }

      // 3. Track Progress for Continue Watching
      // Robustly extract time and duration from various player message structures
      const getNum = (...vals) => {
        for (const val of vals) {
          const num = Number(val);
          if (!isNaN(num) && typeof num === 'number' && num > 0) return num;
        }
        return null;
      };

      const currentTime = getNum(
        data.currentTime, data.time, data.seconds, data.position,
        data.progress?.seconds, data.progress?.position,
        data.data?.currentTime, data.data?.position, data.data?.seconds,
        data.value?.currentTime, data.value?.position
      );

      const duration = getNum(
        data.duration, data.totalTime,
        data.progress?.duration,
        data.data?.duration,
        data.value?.duration
      );
      
      if (user && currentTime && currentTime > 10) { // Don't track if < 10s
        const now = Date.now();
        // Sync every 10 seconds to avoid spamming the DB
        if (now - lastProgressSync.current > 10000) {
          lastProgressSync.current = now;
          const coverImg = anime?.coverImage?.large || anime?.coverImage?.extraLarge;
          
          updateProgress(String(id), activeEpisode, Math.floor(currentTime), duration ? Math.floor(duration) : null, getTitle(anime?.title), coverImg)
            .then(res => {
              if (res.success && res.progress) {
                setGlobalProgress(prev => {
                  const filtered = prev.filter(p => p.animeId !== String(id));
                  return [res.progress, ...filtered].slice(0, 100);
                });
              }
            })
            .catch(err => console.error("Failed to sync progress:", err));
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [goNextEpisode, autoSkip, skipTimes, activeEpisode, user, id, anime, getTitle, setGlobalProgress]); // Removed autoNext from deps, using autoNextRef instead for stability

  // ── Performance: Prefetch Next Episode ──
  const prefetchNextEpisode = useCallback(async (nextEpNum) => {
    if (!anikaiEpisodes.length || activeServer !== 1) return;

    const nextEp = anikaiEpisodes.find(e => String(e.number) === String(nextEpNum));
    if (!nextEp || streamCache.current.has(`${nextEp.id}-sub`)) return;

    try {
      // Use background fetch to avoid blocking main thread
      axios.get(`${PYTHON_API}/api/anikai/stream/${nextEp.id}`, {
        params: { lang: 'sub' }
      }).then(resp => {
        if (resp.data?.success && Array.isArray(resp.data.sources) && resp.data.sources.length > 0) {
          streamCache.current.set(`${nextEp.id}-sub`, resp.data);
          console.info(`[Prefetch] Cached Ep ${nextEpNum} (SUB)`);
        }
      }).catch(err => {
        console.warn(`[Prefetch] Failed for Ep ${nextEpNum}:`, err);
      });
    } catch (err) {
      console.error(`[Prefetch] Error for Ep ${nextEpNum}:`, err);
    }
  }, [anikaiEpisodes, activeServer, PYTHON_API]);

  // ── Stream Logic: Fetch iframe URL for the active episode ──
  useEffect(() => {
    let cancelled = false;

    const fetchStream = async () => {
      if (cancelled) return;

      console.info(`[Player] Fetching stream: Episode ${activeEpisode}, Lang: ${playerLang}, Server: ${activeServer}`);

      // --- OPTIMIZATION: Check Cache First BEFORE resetting state ---
      if (activeServer === 1) {
        if (!anikaiEpisodes || anikaiEpisodes.length === 0) return;
        const ep = anikaiEpisodes.find(e => String(e?.number) === String(activeEpisode));
        if (ep) {
          const cacheKey = `${ep.id}-${playerLang}`;
          if (streamCache.current.has(cacheKey)) {
            const cachedData = streamCache.current.get(cacheKey);
            const url = cachedData.iframe_url || (cachedData.sources?.[0]?.url);
            // Verify cache matches requested language
            if (url && cachedData.lang === playerLang) {
              const finalUrl = `${url}#lang=${playerLang}`;
              setStreamData(cachedData);
              setStreamUrl(finalUrl);
              setStreamLoading(false);
              setFetchError(null);
              console.info(`[Player] ⚡ Instant Cache Hit for Ep ${activeEpisode}`);
              // Trigger prefetch for next one anyway
              if (activeEpisode < episodesList.length) prefetchNextEpisode(activeEpisode + 1);
              return;
            }
          }
        }
      }

      setStreamLoading(true);
      setPageLoading(true);
      setFetchError(null);
      setStreamUrl("");
      setStreamData(null);
      setIframeLoaded(false);

      try {
        let url = "";

        // --- SERVER 1: ANIKAI INTEGRATION (Optimized with Caching & Parallel Fetching) ---
        if (activeServer === 1) {
          if (!anikaiEpisodes || anikaiEpisodes.length === 0) {
            console.info("[Player] Anikai episodes not loaded yet, waiting...");
            return;
          }

          const ep = anikaiEpisodes.find(e => String(e?.number) === String(activeEpisode));
          if (!ep) {
            console.error(`[Player] Episode ${activeEpisode} not found. Available:`, anikaiEpisodes.map(e => e.number));
            setFetchError(`Episode ${activeEpisode} not found on Anikai.`);
            setStreamLoading(false);
            return;
          }

          const token = ep.id;
          const cacheKey = `${token}-${playerLang}`;

          // Re-check cache inside try just in case, though we checked above
          if (streamCache.current.has(cacheKey)) {
            const cachedData = streamCache.current.get(cacheKey);
            setStreamData(cachedData);
            url = cachedData.iframe_url || (cachedData.sources?.[0]?.url);
          } else {
            // 2. Parallel Fetch: Request both SUB and DUB to populate cache and speed up toggle
            // But only await the requested language to show UI as fast as possible
            const fetchLang = (lang) => axios.get(`${PYTHON_API}/api/anikai/stream/${token}`, {
              params: { lang, strict: true },
              timeout: 15000
            }).then(res => res.data).catch(() => null);

            // Start both in parallel
            const subPromise = fetchLang('sub');
            const dubPromise = fetchLang('dub');

            // Wait for requested language with a fallback to avoid crash
            const targetData = await (playerLang === 'sub' ? subPromise : dubPromise);

            if (cancelled) return;

            if (!targetData) {
              setFetchError(`Backend did not respond for ${playerLang.toUpperCase()}.`);
              setStreamLoading(false);
              return;
            }

            const hasContent = (Array.isArray(targetData.sources) && targetData.sources.length > 0) || targetData.iframe_url;

            if (targetData.success && hasContent) {
              streamCache.current.set(cacheKey, targetData);
              setStreamData(targetData);
              url = targetData.iframe_url || (targetData.sources?.[0]?.url);

              // Background: Populate other language cache
              const otherData = await (playerLang === 'sub' ? dubPromise : subPromise);
              const hasOtherContent = otherData?.success && ((Array.isArray(otherData.sources) && otherData.sources.length > 0) || otherData.iframe_url);
              if (hasOtherContent) {
                streamCache.current.set(`${token}-${playerLang === 'sub' ? 'dub' : 'sub'}`, otherData);
              }
            } else {
              setFetchError(`No ${playerLang.toUpperCase()} sources found for this episode.`);
              setStreamLoading(false);
              return;
            }
          }

          // 3. Trigger Prefetch for Next Episode
          if (activeEpisode < episodesList.length) {
            prefetchNextEpisode(activeEpisode + 1);
          }
        }

        // --- SERVER 2: MEGAPLAY INTEGRATION (MAL) ---
        else if (activeServer === 2) {
          if (anime?.idMal) {
            url = `https://megaplay.buzz/stream/mal/${anime.idMal}/${activeEpisode}/${playerLang}`;
          } else {
            setFetchError("MAL ID not found for this anime. Try Server 3.");
          }
        }

        // --- SERVER 3: MEGAPLAY INTEGRATION (AniList) ---
        else if (activeServer === 3) {
          url = `https://megaplay.buzz/stream/ani/${id}/${activeEpisode}/${playerLang}`;
        }


        if (url) {
          // Inject Autoplay and premium params
          try {
            const urlObj = new URL(url);
            if (autoPlay) {
              urlObj.searchParams.set("autoplay", "1");
              // Browser Policy: Autoplay is only allowed if the video is muted.
              // We mute it so it starts automatically as requested, and user can unmute.
              urlObj.searchParams.set("muted", "1");
            } else {
              urlObj.searchParams.set("muted", "0");
            }

            // FORCE REFRESH: Append a hash to ensure unique URL per language
            // This forces React to destroy the iframe and create a new one.
            const finalUrl = `${urlObj.toString()}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL injected into iframe: ${finalUrl}`);
          } catch {
            // Fallback for non-URL strings
            const finalUrl = `${url}#lang=${playerLang}`;
            setStreamUrl(finalUrl);
            console.log(`[Player] Final Stream URL (Fallback) injected: ${finalUrl}`);
          }
        } else {
          setFetchError("Stream link not found for this server.");
        }
      } catch (err) {
        setFetchError(err.response?.data?.error || "Failed to fetch stream.");
      } finally {
        setStreamLoading(false);
      }
    };

    fetchStream();

    return () => { cancelled = true; };
  }, [id, anime?.id, anime?.idMal, activeEpisode, playerLang, activeServer, anikaiEpisodes, PYTHON_API, autoPlay, episodesList.length, prefetchNextEpisode, setPageLoading]);

  const handleReport = async () => {
    // Simulate API call for reporting
    console.info(`[Report] Reporting issue for Anime ID: ${id}, Episode: ${activeEpisode}`);
    setReportSuccess(true);
    // Real-world: await axios.post(`${PYTHON_API}/api/report`, { id, episode: activeEpisode });
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const saveSkipTime = (e) => {
    e.preventDefault();
    const start = e.target.start.value;
    const end = e.target.end.value;
    setSkipTimes(prev => ({ ...prev, [activeEpisode]: { start, end } }));
    setShowSkipModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Anime Not Found</h1>
        <p className="text-white/40 text-sm max-w-md">
          We couldn't retrieve the details for this anime (ID: {id}).
          This could be a connectivity issue with the AniList API or an invalid ID.
        </p>
        <div className="mt-8 p-4 bg-white/5 rounded border border-white/10 text-[10px] font-mono text-left">
          <p className="text-red-500 mb-1">// Debug Info</p>
          <p>ID: {id}</p>
          <p>API: {PYTHON_API || "Relative (Origin)"}</p>
          <p>Status: Loading Finished (No Data)</p>
        </div>
        <Link to="/home" className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors text-sm font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a0a] font-sans pb-20 text-white relative ${isFocusMode ? "overflow-hidden" : ""}`}>
      {!isFocusMode && <Navbar />}

      {/* Focus Mode Curtain / Background */}
      {isFocusMode && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[35] transition-all duration-700 animate-in fade-in cursor-pointer"
          onClick={() => setIsFocusMode(false)}
        />
      )}

      <main className={`${isFocusMode ? 'pt-0' : 'pt-[60px]'} max-w-[1720px] mx-auto px-2 lg:px-4 transition-all duration-500`}>

        {/* 1. Breadcrumbs */}
        {!isFocusMode && (
          <nav className="flex items-center gap-2 py-2 lg:py-4 text-[11px] lg:text-[12px] font-bold text-[#666] overflow-x-auto whitespace-nowrap scrollbar-hide animate-in slide-in-from-top-2">
            <Link to="/home" className="hover:text-white transition-colors">Home</Link>
            <span className="opacity-30">/</span>
            <span className="hover:text-white transition-colors uppercase cursor-pointer">{anime.format || "TV"}</span>
            <span className="opacity-30">/</span>
            <span className="text-white/90 truncate">{getTitle(anime.title)}</span>
          </nav>
        )}

        {/* 2. Main Media Grid (Laptop/Desktop) */}
        <div className={`flex flex-col lg:grid lg:gap-6 ${isFocusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} transition-all duration-500`}>

          {/* LEFT COLUMN: Player + Controls */}
          <div className={`${isFocusMode ? 'lg:col-span-1 fixed inset-0 z-40 flex flex-col items-center justify-center p-4 lg:p-12 pointer-events-none' : 'lg:col-span-3 space-y-1'}`}>

            {/* Video Player Container */}
            <section className={`relative w-full aspect-video bg-[#000] rounded-sm overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 ${isFocusMode ? 'max-w-[90vw] max-h-[85vh] pointer-events-auto ring-1 ring-white/10' : ''}`}>
              {/* Integrated Loader & Error Overlay with Anime Background */}
              {((streamLoading || (streamUrl && !iframeLoaded)) || (!streamLoading && (!streamUrl || fetchError))) && (
                <div className="absolute inset-0 z-20 group">
                  <img
                    src={currentEpisodeImage}
                    alt="Poster"
                    key={activeEpisode} // Trigger re-animation on episode change
                    className={`absolute inset-0 w-full h-full object-cover z-0 transition-all duration-700 animate-in fade-in fill-mode-both ${fetchError || (!streamLoading && !streamUrl) ? 'brightness-[0.7]' : 'brightness-[0.4]'}`}
                  />

                  {/* Content Container */}
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    {/* LOADER STATE */}
                    {(fakeLoading || streamLoading || (streamUrl && !iframeLoaded)) ? (
                      <div className="flex flex-col items-center gap-6 transition-all duration-300">
                        {/* Premium Spinner */}
                        <div className="relative">
                          <div className="w-14 h-14 border-[2px] border-white/5 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-14 h-14 border-[2px] border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(220,38,38,0.4)]"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-white font-medium text-[11px] lg:text-[13px] tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {loadingMessage}
                          </p>
                          <p className="text-white/20 text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.3em] animate-pulse">
                            Please wait a moment
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ERROR / NO STREAM STATE */
                      <div className="animate-in fade-in zoom-in-95 duration-300">
                        <div />
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Player - Use Native Player ONLY for direct sources (no iframe_url).
                  If iframe_url exists, always use iframe since the embed handles its own DRM/decryption. */}
              {streamUrl && (
                streamData?.sources && Array.isArray(streamData.sources) && streamData.sources.length > 0 && !streamData?.iframe_url ? (
                  <VideoPlayer
                    src={streamData.sources[0].url}
                    type={streamData.sources[0].type}
                    poster={anime?.coverImage?.extraLarge || anime?.coverImage?.large}
                    subtitles={streamData.subtitles || []}
                    initialTime={initialTime}
                  />
                ) : (
                  <iframe
                    ref={iframeRef}
                    key={`${activeServer}-${activeEpisode}-${playerLang}-${streamUrl}`}
                    src={streamUrl}
                    onLoad={() => setIframeLoaded(true)}
                    className={`w-full h-full border-0 transition-opacity duration-500 ${!iframeLoaded ? 'opacity-0' : 'opacity-100'}`}
                    allowFullScreen
                    scrolling="no"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  />
                )
              )}
            </section>

            {/* Action Toolbar (Reverted to Original Style) */}
            <section className="relative w-full bg-[#0a0a0a] border-x border-b border-white/5 px-4 lg:px-6 py-2 lg:py-3 flex flex-wrap items-center justify-between gap-4 lg:gap-6 select-none">
              <div className="flex items-center gap-4 sm:gap-5 lg:gap-6">
                {/* Focus Mode */}
                <button
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className={`flex items-center gap-1.5 transition-all ${isFocusMode ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                >
                  <Moon size={15} fill={isFocusMode ? "currentColor" : "none"} />
                  <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Focus</span>
                </button>

                {/* AutoPlay */}
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className="flex items-center gap-1.5 group transition-all"
                >
                  <div className="relative">
                    <PlayCircle
                      size={15}
                      fill="none"
                      className={`transition-all ${autoPlay ? 'text-white' : 'text-white/40 group-hover:text-white'} group-hover:scale-110`}
                    />
                    {autoPlay && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:inline transition-colors ${autoPlay ? 'text-red-500' : 'text-white/40 group-hover:text-white'}`}>
                    AutoPlay
                  </span>
                </button>

                {/* AutoNext */}
                <button
                  onClick={() => setAutoNext(!autoNext)}
                  className="flex items-center gap-1.5 group transition-all"
                >
                  <div className="relative">
                    <FastForward
                      size={15}
                      fill="none"
                      className={`transition-all ${autoNext ? 'text-white' : 'text-white/40 group-hover:text-white'} group-hover:scale-110`}
                    />
                    {autoNext && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:inline transition-colors ${autoNext ? 'text-red-500' : 'text-white/40 group-hover:text-white'}`}>
                    AutoNext
                  </span>
                </button>

                {/* AutoSkip */}
                <button
                  onClick={() => setAutoSkip(!autoSkip)}
                  className="flex items-center gap-1.5 group transition-all"
                >
                  <div className="relative">
                    <Scissors
                      size={15}
                      className={`transition-all ${autoSkip ? 'text-white' : 'text-white/40 group-hover:text-white'} group-hover:scale-110`}
                    />
                    {autoSkip && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:inline transition-colors ${autoSkip ? 'text-red-500' : 'text-white/40 group-hover:text-white'}`}>
                    AutoSkip
                  </span>
                </button>

                {/* Add Skiptime */}
                <button
                  onClick={() => setShowSkipModal(true)}
                  className={`flex items-center gap-1.5 transition-all ${skipTimes[activeEpisode] ? 'text-yellow-500' : 'text-white/40 hover:text-white'}`}
                >
                  <Timer size={15} />
                  <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Add Skiptime</span>
                </button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-5 lg:gap-6">
                <div className="flex items-center gap-3 lg:gap-4 border-r border-white/5 pr-4 sm:pr-5 lg:pr-6">
                  <button
                    onClick={goPrevEpisode}
                    className={`flex items-center gap-1.5 transition-all ${activeEpisode <= 1 ? 'opacity-20 pointer-events-none' : 'text-white/40 hover:text-white'}`}
                  >
                    <SkipBack size={15} />
                    <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Prev</span>
                  </button>
                  <button
                    onClick={goNextEpisode}
                    className={`flex items-center gap-1.5 transition-all ${activeEpisode >= episodesList.length ? 'opacity-20 pointer-events-none' : 'text-white/40 hover:text-white'}`}
                  >
                    <SkipForward size={15} />
                    <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Next</span>
                  </button>
                </div>

                {!isFocusMode && (
                  <>
                    <div className="relative">
                      <button
                        onClick={handleToggleBackendWatchlist}
                        disabled={isWatchlistLoading}
                        className={`flex items-center gap-1.5 transition-all ${isBookmarked ? 'text-red-600' : 'text-white/40 hover:text-white'}`}
                      >
                        {isWatchlistLoading ? (
                           <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                           <Heart size={15} fill={isBookmarked ? "currentColor" : "none"} />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                          {isBookmarked ? 'Saved' : 'Add to Watchlist'}
                        </span>
                      </button>

                      {addingAction && (
                        <div className="absolute bottom-full right-0 mb-3 w-36 bg-[#161616] border border-white/5 rounded-[2px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 flex flex-col">
                          {['Watching', 'On-Hold', 'Planning', 'Completed', 'Dropped'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleUpdateStatus(status)}
                              className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors ${
                                (backendWatchlist.find(i => i.animeId === String(id))?.status || 'Planning') === status
                                ? 'text-white border-l-2 border-red-600 bg-white/5'
                                : 'text-white/60 hover:text-white hover:bg-[#222]'
                                }`}
                            >
                              {status}
                            </button>
                          ))}
                          <button
                            onClick={async () => {
                              setIsWatchlistLoading(true);
                              const res = await removeFromWatchlist(id);
                              if (res.success) {
                                setBackendWatchlist(res.watchlist);
                                if (typeof setGlobalWatchlist === 'function') {
                                  setGlobalWatchlist(res.watchlist);
                                }
                              }
                              setAddingAction(false);
                              setIsWatchlistLoading(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors text-red-500 hover:text-white hover:bg-red-600/20 border-t border-white/5"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleReport}
                      className={`flex items-center gap-1.5 transition-all ${reportSuccess ? 'text-green-500' : 'text-white/40 hover:text-white'}`}
                    >
                      <Flag size={15} />
                      <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">{reportSuccess ? 'Reported!' : 'Report'}</span>
                    </button>
                  </>
                )}
              </div>
            </section>
            {!isFocusMode && (
              <section className="flex flex-col md:flex-row md:items-center justify-between py-4 lg:py-6 gap-4 lg:gap-6">
                <div className="text-center md:text-left">
                  <p className="text-[13px] lg:text-[14px] font-bold text-white/70 tracking-wide">
                    You are watching <span className="text-red-600">Episode {activeEpisode}</span>
                  </p>
                  <p className="text-[9px] lg:text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1">
                    Switch servers if the current link is unstable.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex bg-[#161616] p-1 rounded-sm border border-white/5">
                    <button
                      onClick={() => setPlayerLang("sub")}
                      disabled={!hasSub}
                      className={`flex items-center gap-2 px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "sub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                        } ${!hasSub ? "opacity-20 pointer-events-none" : ""}`}
                    >
                      <MessageSquare size={12} fill="currentColor" className="opacity-50" />
                      Sub
                    </button>
                    <button
                      onClick={() => setPlayerLang("dub")}
                      disabled={!hasDub}
                      className={`flex items-center gap-2 px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${playerLang === "dub" ? "bg-red-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                        } ${!hasDub ? "opacity-20 pointer-events-none" : ""}`}
                    >
                      <Mic size={12} fill="currentColor" className="opacity-50" />
                      Dub
                    </button>
                  </div>


                  {/* Servers List */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[300px]">
                    {[1, 2, 3].map((num) => (
                      <button
                        key={num}
                        onClick={() => setActiveServer(num)}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all shrink-0 ${activeServer === num
                          ? "bg-red-600 text-white border-red-500 shadow-xl shadow-red-900/20"
                          : "bg-[#111] text-white/30 border-white/5 hover:bg-[#161616] hover:text-white/70"
                          }`}
                      >
                        S{num}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Next Episode Banner - Moved here for better visibility */}
            {!isFocusMode && (
              <div className="border-t border-white/5 bg-[#0d0d0d]/50">
                <NextEpisodeBanner anime={anime} />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Episodes Sidebar */}
          {!isFocusMode && (
            <aside className="lg:col-span-1 space-y-4 pt-4 lg:pt-0 animate-in fade-in slide-in-from-right duration-500">
              <div className="bg-[#0d0d0d] rounded-sm border border-white/5 overflow-hidden flex flex-col h-[500px] lg:h-full lg:max-h-[700px]">

                {/* Sidebar Header */}
                <header className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111] min-h-[60px]">
                  {isEpisodeSearchOpen ? (
                    <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-right-2 duration-300">
                      <Search size={14} className="text-red-500 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Search episode or title..."
                        value={episodeSearchQuery}
                        onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-[12px] text-white placeholder:text-white/20 w-full font-medium"
                      />
                      <button
                        onClick={() => {
                          setIsEpisodeSearchOpen(false);
                          setEpisodeSearchQuery("");
                        }}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h2 className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">Episodes</h2>
                        <div className="flex gap-2">
                          <MessageSquare size={12} className="text-red-500" fill="currentColor" />
                          <Mic size={12} className="text-white/20" fill="currentColor" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-white/50">
                        <Search
                          size={17}
                          className="hover:text-white cursor-pointer transition-colors"
                          onClick={() => setIsEpisodeSearchOpen(true)}
                        />
                        <button
                          onClick={() => {
                            if (episodeLayout === "grid") setEpisodeLayout("list");
                            else if (episodeLayout === "list") setEpisodeLayout("detailed");
                            else setEpisodeLayout("grid");
                          }}
                          className="hover:text-white transition-colors cursor-pointer flex items-center"
                        >
                          {episodeLayout === "grid" && <LayoutGrid size={17} />}
                          {episodeLayout === "list" && <List size={17} />}
                          {episodeLayout === "detailed" && <Image size={17} />}
                        </button>
                      </div>
                    </>
                  )}
                </header>

                {/* Range Selector */}
                {filteredEpisodes.length > 0 && (
                  <div className="p-4 bg-[#0a0a0a] border-b border-white/5">
                    {(() => {
                      const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
                      const pageStart = episodePage * EPISODES_PER_PAGE + 1;
                      const pageEnd = Math.min((episodePage + 1) * EPISODES_PER_PAGE, filteredEpisodes.length);
                      return (
                        <div className="flex items-center justify-between bg-[#161616] px-3 py-2 rounded-sm border border-white/5">
                          <button
                            disabled={episodePage === 0}
                            onClick={() => setEpisodePage(p => p - 1)}
                            className={`transition-colors ${episodePage > 0 ? 'text-white hover:text-red-500' : 'text-white/5'}`}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="text-[11px] font-bold tracking-widest text-white/80">
                            {String(pageStart).padStart(3, '0')}-{String(pageEnd).padStart(3, '0')}
                          </span>
                          <button
                            disabled={episodePage >= totalPages - 1}
                            onClick={() => setEpisodePage(p => p + 1)}
                            className={`transition-colors ${episodePage < totalPages - 1 ? 'text-white hover:text-red-500' : 'text-white/5'}`}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 lg:p-4 custom-scrollbar bg-[#0d0d0d]">
                  {filteredEpisodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-white/30 animate-in fade-in duration-300">
                      <Search size={32} className="mb-3 opacity-20" />
                      <span className="text-[13px] font-medium">No episodes found</span>
                      <button
                        onClick={() => setEpisodeSearchQuery("")}
                        className="mt-4 text-[11px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : episodeLayout === "list" && (
                    <div className="flex flex-col gap-2">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => {
                        const epData = malEpisodes?.find(e => e.mal_id === ep);
                        const title = epData?.title || `Episode ${ep}`;
                        return (
                          <button
                            key={ep}
                            onClick={() => setActiveEpisode(ep)}
                            className={`w-full text-left flex flex-col gap-1 px-4 py-3 text-[12px] font-medium transition-all rounded-[2px] border ${activeEpisode === ep
                              ? "bg-red-600/10 text-red-500 border-red-500 shadow-lg"
                              : "bg-[#161616] text-white/70 border-white/5 hover:bg-[#202020] hover:text-white"
                              }`}
                          >
                            <div className="flex items-start gap-3 w-full">
                              <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 shrink-0 mt-[2px]">EP {String(ep).padStart(2, '0')}</span>
                              <span className="line-clamp-2 leading-tight flex-1">{title}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {episodeLayout === "detailed" && (
                    <div className="flex flex-col gap-3">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => {
                        const epData = malEpisodes?.find(e => e.mal_id === ep);
                        // Match streamingEpisodes by episode number in title, not by index
                        const aniListEp = anime?.streamingEpisodes?.find(
                          se => se.title && /Episode\s+(\d+)/i.test(se.title) && parseInt(se.title.match(/Episode\s+(\d+)/i)[1]) === ep
                        ) || anime?.streamingEpisodes?.[ep - 1];
                        const title = epData?.title || aniListEp?.title?.replace(/^Episode \d+\s*-\s*/i, '') || kitsuEpisodes?.[ep]?.title || kitsuEpisodes?.[String(ep)]?.title || `Episode ${ep}`;

                        // FIX: Detect if AniList thumbnail is just a placeholder (same as show banner/cover)
                        const isPlaceholder = (url) => {
                          if (!url) return true;
                          return url === anime?.bannerImage || url === anime?.coverImage?.large;
                        };

                        // 1. Kitsu (Best for unique screenshots / Netflix feel)
                        // 2. Jikan (MAL) Image
                        // 3. AniList (Only if it's NOT a placeholder)
                        // 4. Fallback to anime banner
                        const thumbnail = kitsuEpisodes?.[ep]?.image
                          || kitsuEpisodes?.[String(ep)]?.image
                          || epData?.images?.jpg?.image_url
                          || (!isPlaceholder(aniListEp?.thumbnail) && aniListEp?.thumbnail)
                          || anime?.bannerImage
                          || anime?.coverImage?.large;

                        return (
                          <button
                            key={ep}
                            onClick={() => setActiveEpisode(ep)}
                            className={`group w-full text-left flex items-start gap-3 p-3 transition-all rounded-[4px] border ${activeEpisode === ep
                              ? "bg-[#111] border-red-600 shadow-lg"
                              : "bg-[#161616] border-white/5 hover:bg-[#202020] hover:border-white/20"
                              }`}
                          >
                            <div className="w-24 h-16 shrink-0 bg-[#222] rounded-[2px] overflow-hidden relative">
                              {thumbnail ? (
                                <img src={thumbnail} alt={title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#111]">
                                  <span className="text-[18px] font-black text-white/10">{String(ep).padStart(2, '0')}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlayCircle size={20} className="text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-red-500 mb-1">Episode {ep}</div>
                              <h4 className="text-[13px] font-bold text-white mb-1 line-clamp-1">{title}</h4>
                              <div className="flex items-center flex-wrap gap-3 text-[11px] text-white/40 mt-1">
                                {epData?.score && (
                                  <span className="flex items-center gap-1">
                                    <Star size={10} className="text-yellow-500" fill="currentColor" />
                                    <span>{epData.score}</span>
                                  </span>
                                )}
                                {epData?.aired && (
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} className="opacity-50" />
                                    <span>{new Date(epData.aired).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </span>
                                )}
                                {(epData?.filler || epData?.recap) && (
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {epData.filler && <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-widest rounded-[2px]">Filler</span>}
                                    {epData.recap && <span className="px-1.5 py-0.5 bg-white/10 text-white/80 text-[8px] font-bold uppercase tracking-widest rounded-[2px]">Recap</span>}
                                  </div>
                                )}
                              </div>
                              {/* Kitsu Episode Synopsis (Mini-Info) */}
                              {(kitsuEpisodes?.[ep]?.description || kitsuEpisodes?.[String(ep)]?.description) && (
                                <p className="text-[11px] text-white/30 line-clamp-2 leading-relaxed mt-2 group-hover:text-white/60 transition-colors">
                                  {kitsuEpisodes?.[ep]?.description || kitsuEpisodes?.[String(ep)]?.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {episodeLayout === "grid" && (
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {filteredEpisodes.slice(episodePage * EPISODES_PER_PAGE, (episodePage + 1) * EPISODES_PER_PAGE).map(ep => (
                        <button
                          key={ep}
                          onClick={() => setActiveEpisode(ep)}
                          className={`h-9 lg:h-10 flex items-center justify-center text-[11px] lg:text-[12px] font-bold transition-all rounded-[2px] border ${activeEpisode === ep
                            ? "bg-red-600 text-white border-red-500 shadow-lg"
                            : "bg-[#161616] text-white/30 border-white/5 hover:bg-[#202020] hover:text-white"
                            }`}
                        >
                          {ep}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>


        {/* NEW SEASONS UI */}
        {stableSeasons.length > 0 && !isFocusMode && (
          <section className="py-10 border-t border-white/5 bg-[#0a0a0a] animate-in fade-in duration-700">
            <header className="mb-6 px-2">
              <h2 className="text-[14px] font-bold tracking-[0.2em] text-white uppercase opacity-80">
                Seasons
              </h2>
            </header>

            <div className="flex gap-1 overflow-x-auto pb-6 scrollbar-hide px-2">
              {stableSeasons.map((item) => (
                <Link
                  key={item.id}
                  to={item.isActive ? "#" : `/watch/${item.id}`}
                  onClick={(e) => item.isActive && e.preventDefault()}
                  className={`flex-shrink-0 relative group rounded-[2px] overflow-hidden transition-all duration-300 border border-white/5 ${item.isActive ? 'ring-1 ring-white/10' : 'hover:border-white/20'}`}
                  style={{ width: '220px', height: '110px' }}
                >
                  {/* Background Image with Blur/Darken */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={item.coverImage?.extraLarge || item.coverImage?.large}
                      alt=""
                      className={`w-full h-full object-cover transition-all duration-700 ${item.isActive ? 'scale-110 blur-[1px] opacity-40' : 'opacity-20 blur-[2px] group-hover:opacity-30'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60" />
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
                    {/* Episodes Badge */}
                    <div className={`px-2 py-0.5 rounded-[1px] font-bold text-[10px] uppercase tracking-[0.1em] mb-2 shadow-sm transition-colors ${item.isActive
                      ? 'bg-red-600 text-white'
                      : 'bg-[#b0b0b0] text-[#111]'
                      }`}>
                      {item.episodes || '?'} Eps
                    </div>

                    {/* Season Label */}
                    <h3 className={`text-[13px] font-bold uppercase tracking-[0.1em] text-center line-clamp-1 transition-all ${item.isActive
                      ? 'text-white'
                      : 'text-[#666] group-hover:text-[#999]'
                      }`}>
                      {getSeasonLabel(item)}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. Anime Details Section */}
        {!isFocusMode && (
          <section className="py-8 lg:py-12 border-t border-white/5 mt-6 lg:mt-10 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
              {/* Poster Column */}
              <div className="w-[180px] sm:w-[220px] shrink-0 mx-auto md:mx-0">
                <div className="relative group overflow-hidden rounded-[4px] border border-white/10 shadow-2xl aspect-[2/3] w-full">
                  {anime.coverImage && (
                    <img
                      src={anime.coverImage.extraLarge || anime.coverImage.large}
                      alt={getTitle(anime.title)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0">
                {/* Title Area */}
                <div className="mb-4">
                  <h1 className="text-2xl sm:text-[32px] font-bold text-white leading-tight mb-1 line-clamp-2">
                    {getTitle(anime.title)}
                  </h1>
                  {anime.synonyms && anime.synonyms.length > 0 && (
                    <p className="text-[13px] text-white/40 italic line-clamp-1 mt-1 mb-4">
                      {anime.synonyms.slice(0, 3).join("; ")}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-6 text-[11px] font-bold">
                    <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                      <span className="px-1.5 h-full bg-[#e3e3e3] text-black flex items-center">CC</span>
                      <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-[2px] overflow-hidden tracking-wider h-6">
                      <span className="px-1.5 h-full bg-[#f4a1ce] text-black flex items-center justify-center"><Mic size={11} fill="currentColor" /></span>
                      <span className="px-2 h-full flex items-center">{anime.episodes || "?"}</span>
                    </div>
                    <span className="bg-[#b0b0b0] text-[#111] h-6 flex items-center px-2 rounded-[2px] font-medium">{resolvedInfo.rating || "?"}</span>
                    {anime.isAdult && <span className="bg-[#e3e3e3] text-black h-6 flex items-center px-2 rounded-[2px] uppercase">R</span>}
                    <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.format || "TV"}</span>
                    <span className="bg-white/10 text-white/80 h-6 flex items-center px-2 rounded-[2px] uppercase">{anime.duration ? `${anime.duration} min` : "? min"}</span>
                  </div>
                </div>


                {/* Description */}
                <div
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className={`text-[14px] text-white/60 leading-relaxed mb-8 transition-all duration-500 cursor-pointer ${isDescExpanded ? "" : "line-clamp-4"}`}
                  dangerouslySetInnerHTML={{ __html: resolvedInfo.description || "No description available." }}
                />

                {/* Grid Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-[13px] mb-8">
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Country:</span>
                    <span className="text-white/80">{resolvedInfo.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Premiered:</span>
                    <span className="text-white/80 capitalize">{resolvedInfo.premiered || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Date aired:</span>
                    <span className="text-white/80">{resolvedInfo.aired || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Broadcast:</span>
                    <span className="text-white/80">{resolvedInfo.broadcast || 'Unknown'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Episodes:</span>
                    <span className="text-white/80">{resolvedInfo.episodes || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Duration:</span>
                    <span className="text-white/80">{resolvedInfo.duration || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Status:</span>
                    <span className="text-white/80 capitalize">{resolvedInfo.status || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">MAL Score:</span>
                    <span className="text-white/80">{resolvedInfo.mal_score || '?'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Links:</span>
                    <div className="flex items-center gap-1">
                      {anime.idMal && <a href={`https://myanimelist.net/anime/${anime.idMal}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors">MAL</a>}
                      {anime.idMal && <span className="text-white/80">,</span>}
                      {anime.id && <a href={`https://anilist.co/anime/${anime.id}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:text-red-500 transition-colors ml-1">AL</a>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-white/40 font-medium min-w-[85px]">Studios:</span>
                    <span className="text-white/80 truncate">{resolvedInfo.studios || "N/A"}</span>
                  </div>
                  <div className="flex items-start gap-2 sm:col-span-2">
                    <span className="text-white/40 font-medium min-w-[70px]">Producers:</span>
                    <span className="text-white/80 line-clamp-1">{resolvedInfo.producers || "N/A"}</span>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {(resolvedInfo.genres || []).map(g => (
                    <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-4 py-1 bg-white/5 border border-white/5 rounded-[4px] text-[12px] font-medium text-white/50 hover:text-white hover:border-white/20 hover:bg-white/10 transition-colors cursor-pointer">
                      {g}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pixel-Perfect Rating Section (Right Column) */}
              <div className="flex flex-col gap-4 w-full md:w-[280px] lg:w-[320px] shrink-0">
                <div className="bg-[#0d0d0d] border border-white/5 p-7 rounded-sm shadow-xl relative mt-0 md:mt-2 min-h-[160px] flex flex-col items-center justify-center">

                  {userRating ? (
                    <div className="text-center py-4 animate-in zoom-in duration-500">
                      <div className="flex justify-center mb-3">
                        <CheckCircle2 size={28} className="text-white/40" />
                      </div>
                      <p className="text-[14px] font-medium text-white/80 mb-1">Thank you for rating!</p>
                      <p className="text-[12px] text-white/20">Your feedback is appreciated.</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <h3 className="text-[18px] font-medium text-white/80 mb-1">How'd you rate this anime?</h3>
                        <p className="text-[13px] text-white/30 font-medium">
                          {resolvedInfo.mal_score || "8.58"} / {resolvedInfo.scored_by?.toLocaleString() || "1,221"} reviews
                        </p>
                      </div>

                      <div className="flex items-center gap-1 w-full px-2">
                        {[
                          { icon: Frown, val: "boring" },
                          { icon: Smile, val: "decent" },
                          { icon: Smile, val: "masterpiece", isHappy: true }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setUserRating(item.val)}
                            className="flex-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.02] h-20 flex items-center justify-center transition-all duration-300 rounded-[2px] group"
                          >
                            <item.icon
                              size={28}
                              strokeWidth={1.5}
                              className={`text-white/30 group-hover:text-white/80 transition-colors ${item.isHappy ? 'scale-110' : ''}`}
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 8. Extra Info: Characters, Trailer, Recs */}
        {!isFocusMode && (
          <section className="py-16 border-t border-white/5 space-y-20 animate-in fade-in duration-1000">
            {/* Characters Section */}
            {anime.characters?.edges?.length > 0 && (
              <div className="space-y-6">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-1 bg-red-600 rounded-full" />
                    <h2 className="text-[14px] font-bold tracking-[0.3em] text-white uppercase">Character Cast</h2>
                  </div>
                  <span className="text-[10px] font-medium text-white/20 uppercase tracking-widest hidden sm:block">
                    {Math.min(anime.characters.edges.length, 12)} Characters
                  </span>
                </header>

                {/* Mobile: Horizontal Scroll */}
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory md:hidden -mx-4 px-4">
                  {anime.characters.edges.slice(0, 12).map(edge => (
                    <Link
                      key={edge.node.id}
                      to={`/character/${edge.node.id}`}
                      className="group flex-shrink-0 w-[130px] snap-start"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-2">
                        <img
                          src={edge.node.image?.large}
                          alt={edge.node.name?.userPreferred}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <p className="text-[11px] font-semibold text-white truncate leading-tight">{edge.node.name?.userPreferred}</p>
                          <p className="text-[8px] font-medium text-white/40 uppercase tracking-wider mt-0.5">{edge.role}</p>
                        </div>
                      </div>
                      {edge.voiceActors?.[0] && (
                        <div className="flex items-center gap-1.5 px-1">
                          <img
                            src={edge.voiceActors[0].image?.large}
                            alt={edge.voiceActors[0].name?.userPreferred}
                            className="w-5 h-5 rounded-full object-cover border border-white/10"
                            loading="lazy"
                          />
                          <span className="text-[9px] text-white/30 truncate">{edge.voiceActors[0].name?.userPreferred}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Desktop: Grid Layout */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {anime.characters.edges.slice(0, 12).map(edge => (
                    <Link
                      key={edge.node.id}
                      to={`/character/${edge.node.id}`}
                      className="group flex bg-[#0d0d0d] rounded-sm overflow-hidden border border-white/5 h-[76px] transition-all hover:bg-[#111] hover:border-red-600/30"
                    >
                      {/* Character Side */}
                      <div className="relative w-14 h-full overflow-hidden shrink-0">
                        <img src={edge.node.image?.large} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                        <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-col justify-center px-4 flex-1 min-w-0">
                        <span className="text-[12px] font-semibold text-white transition-colors group-hover:text-red-500 truncate">{edge.node.name?.userPreferred}</span>
                        <span className="text-[9px] font-medium text-white/20 uppercase tracking-[0.15em] truncate">{edge.role}</span>
                      </div>
                      {/* Voice Actor Side */}
                      {edge.voiceActors?.[0] && (
                        <>
                          <div className="flex flex-col justify-center px-4 items-end min-w-0">
                            <span className="text-[11px] font-medium text-white/50 truncate max-w-[120px]">{edge.voiceActors[0].name?.userPreferred}</span>
                            <span className="text-[8px] font-medium text-white/15 uppercase tracking-wider">Japanese</span>
                          </div>
                          <div className="relative w-14 h-full overflow-hidden shrink-0">
                            <img src={edge.voiceActors[0].image?.large} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Custom Comment Section (Aniwatch Style) */}
            <CustomCommentSection 
              animeId={id} 
              animeTitle={getTitle(anime.title)} 
              episode={activeEpisode} 
              relations={relations}
              recommendations={recommendations}
            />
          </section>
        )}

        {/* 9. Global Footer */}
        {!isFocusMode && <Footer />}
      </main>

      {/* Skip Time Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className="bg-[#111] border border-white/10 p-8 rounded-[4px] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSkipModal(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <FastForward size={20} className="rotate-90" />
            </button>
            <h2 className="text-[20px] font-black uppercase tracking-[0.2em] mb-2">Add Skip Time</h2>
            <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold mb-8">Set intro/outro for Ep {activeEpisode}</p>

            <form onSubmit={saveSkipTime} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Start (sec)</label>
                  <input
                    name="start"
                    type="number"
                    defaultValue={skipTimes[activeEpisode]?.start || ""}
                    placeholder="80"
                    className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30">End (sec)</label>
                  <input
                    name="end"
                    type="number"
                    defaultValue={skipTimes[activeEpisode]?.end || ""}
                    placeholder="120"
                    className="w-full bg-white/5 border border-white/5 focus:border-red-600 outline-none p-3 text-white font-bold rounded-[2px] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-[12px] font-black uppercase tracking-[0.3em] rounded-[2px] transition-all active:scale-95 shadow-lg shadow-red-900/20"
              >
                Save Timeline
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Toast Notification */}
      {reportSuccess && (
        <div className="fixed bottom-10 right-10 z-[100] bg-green-600 text-white px-8 py-4 rounded-[2px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl animate-in slide-in-from-bottom duration-500">
          Issue Reported Successfully
        </div>
      )}
    </div>
  );
}
