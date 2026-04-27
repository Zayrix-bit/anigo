import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

const VideoPlayer = ({ src, type, poster, subtitles = [], onEnded, onTimeUpdate, onLoaded, initialTime = 0 }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || typeof src !== 'string') return;

    console.info(`[VideoPlayer] Initializing for: ${src.substring(0, 50)}...`);

    // Forward video events to parent component AND via postMessage
    const handleEnded = () => {
      if (onEnded) onEnded();
      // Also broadcast via postMessage so the existing message listener catches it
      window.postMessage({ event: "complete", type: "ended" }, "*");
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      if (onTimeUpdate) onTimeUpdate(currentTime, duration);
      // Broadcast via postMessage for AutoSkip
      window.postMessage({ event: "timeupdate", currentTime, duration }, "*");
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Handle skip messages from parent
    const handleMessage = (e) => {
      if (e.data?.event === "skip") {
        const amount = e.data.amount || 0;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
      }
    };
    window.addEventListener("message", handleMessage);

    // Default Plyr options
    const defaultOptions = {
      autoplay: true,
      captions: { active: true, update: true, language: 'en' },
      quality: {
        default: 1080,
        options: [1080, 720, 480, 360],
      },
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 
        'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
    };

    const initPlyr = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      playerRef.current = new Plyr(video, defaultOptions);
      console.info("[VideoPlayer] Plyr initialized");
      
      // Notify parent that media is loaded
      if (onLoaded) onLoaded();

      // Resume from initialTime
      if (initialTime > 0) {
        const handleReady = () => {
          video.currentTime = initialTime;
          video.removeEventListener('canplay', handleReady);
        };
        video.addEventListener('canplay', handleReady);
      }
    };

    // Robust HLS Detection
    const checkHls = () => {
      if (type === 'hls') return true;
      if (src.includes('.m3u8') || src.includes('index.m3u8')) return true;
      
      // If proxied, check the original URL inside the query param
      if (src.includes('/api/proxy')) {
        const urlMatch = src.match(/url=([^&]+)/);
        if (urlMatch) {
          try {
            const originalUrl = atob(decodeURIComponent(urlMatch[1]));
            if (originalUrl.includes('.m3u8')) return true;
          } catch {
            // Fallback: if it's our proxy, it's almost always HLS for Miruro
            return true; 
          }
        }
      }
      return false;
    };

    const isHls = checkHls();
    console.info(`[VideoPlayer] Detected type: ${isHls ? 'HLS' : 'MP4'} (Prop Type: ${type})`);

    if (isHls) {
      if (Hls.isSupported()) {
        console.info("[VideoPlayer] HLS.js supported, loading source...");
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.info("[VideoPlayer] HLS Manifest Parsed", data);
          initPlyr();
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("[VideoPlayer] HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("[VideoPlayer] HLS Network Error - Retrying...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("[VideoPlayer] HLS Media Error - Recovering...");
                hls.recoverMediaError();
                break;
              default:
                console.error("[VideoPlayer] HLS Fatal Error - Unrecoverable");
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.info("[VideoPlayer] Native HLS supported (Safari)");
        video.src = src;
        video.addEventListener('loadedmetadata', initPlyr);
      }
    } else {
      console.info("[VideoPlayer] Loading direct MP4 source");
      video.src = src;
      video.addEventListener('loadedmetadata', initPlyr);
    }

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', initPlyr);
      window.removeEventListener("message", handleMessage);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hlsRef.current && typeof hlsRef.current.destroy === 'function') {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, type, onEnded, onTimeUpdate, onLoaded, initialTime]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        playsInline
        controls
        poster={poster}
        className="w-full h-full"
      >
        {Array.isArray(subtitles) && subtitles.map((sub, index) => {
          if (!sub || !sub.url) return null;
          return (
            <track
              key={index}
              kind="captions"
              label={sub.label || `Language ${index}`}
              srcLang={sub.lang || 'en'}
              src={sub.url}
              default={sub.default}
            />
          );
        })}
      </video>
    </div>
  );
};

export default VideoPlayer;
