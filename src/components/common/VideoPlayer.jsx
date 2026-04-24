import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

const VideoPlayer = ({ src, type, poster, subtitles = [], onEnded, onTimeUpdate, initialTime = 0 }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || typeof src !== 'string') return;

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
      
      // Resume from initialTime
      if (initialTime > 0) {
        const handleReady = () => {
          video.currentTime = initialTime;
          video.removeEventListener('canplay', handleReady);
        };
        video.addEventListener('canplay', handleReady);
      }
    };

    const isHls = type === 'hls' || src.includes('.m3u8') || src.includes('index.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          initPlyr();
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for Safari
        video.src = src;
        initPlyr();
      }
    } else {
      // Direct MP4
      video.src = src;
      initPlyr();
    }

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
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
  }, [src, type, onEnded, onTimeUpdate, initialTime]);

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
