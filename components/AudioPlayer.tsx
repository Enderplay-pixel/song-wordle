"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SNIPPET_DURATIONS } from "@/lib/gameLogic";

// Load the YouTube IFrame API once, globally.
let ytReadyPromise: Promise<void> | null = null;
function loadYTApi(): Promise<void> {
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) { resolve(); return; }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytReadyPromise;
}

interface AudioPlayerProps {
  youtubeId: string;
  startOffset: number;
  attempt: number;
  disabled: boolean;
}

export default function AudioPlayer({
  youtubeId,
  startOffset,
  attempt,
  disabled,
}: AudioPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const createdRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const duration = SNIPPET_DURATIONS[attempt] ?? SNIPPET_DURATIONS[SNIPPET_DURATIONS.length - 1];
  // 6th stage (index 5) = "Full": play the whole song, no cutoff
  const isFull = attempt >= 5;
  const isLost = isFull; // keep internal naming: no cutoff when full
  const snippetDuration = isFull ? 999 : duration;

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Create the YT player exactly once. Guarded against React StrictMode's
  // double-mount (which otherwise destroys + recreates and breaks onReady).
  // We never destroy it — the component lives for the whole game session.
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    loadYTApi().then(() => {
      if (!hostRef.current) return;
      const YT = (window as any).YT;
      // YT replaces the target node with an iframe, so give it a fresh inner div
      const inner = document.createElement("div");
      inner.style.width = "100%";
      inner.style.height = "100%";
      hostRef.current.appendChild(inner);

      playerRef.current = new YT.Player(inner, {
        width: "100%",
        height: "100%",
        videoId: youtubeId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          playsinline: 1,
          iv_load_policy: 3,
          start: Math.floor(startOffset),
        },
        events: {
          onReady: () => setReady(true),
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the song changes, cue the new video (no autoplay) and reset
  useEffect(() => {
    setIsPlaying(false);
    clearTimers();
    if (ready && playerRef.current) {
      try {
        playerRef.current.cueVideoById({ videoId: youtubeId, startSeconds: startOffset });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  // Reset playing state when attempt changes (snippet length changes)
  useEffect(() => {
    setIsPlaying(false);
    clearTimers();
  }, [attempt]);

  const handlePlay = useCallback(() => {
    if (disabled || !ready || !playerRef.current) return;
    const p = playerRef.current;
    clearTimers();

    const limit = startOffset + snippetDuration; // seconds

    p.seekTo(startOffset, true);
    p.playVideo();
    setIsPlaying(true);

    if (isLost) return; // full preview, no cutoff

    // Poll the REAL playhead (getCurrentTime is synchronous in the YT API).
    // Position only advances once audio truly plays, so buffering latency is
    // absorbed — the snippet is measured in actually-played seconds.
    pollRef.current = setInterval(() => {
      try {
        const t = p.getCurrentTime(); // seconds
        if (t >= limit) {
          p.pauseVideo();
          setIsPlaying(false);
          clearTimers();
        }
      } catch {}
    }, 20);

    // Safety net in case playback stalls
    timerRef.current = setTimeout(() => {
      try { p.pauseVideo(); } catch {}
      setIsPlaying(false);
      clearTimers();
    }, snippetDuration * 1000 + 8000);
  }, [disabled, ready, startOffset, snippetDuration, isLost]);

  const handleStop = useCallback(() => {
    try { playerRef.current?.pauseVideo(); } catch {}
    setIsPlaying(false);
    clearTimers();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {/* Play / Stop button */}
        <button
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={disabled || !ready}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-200 select-none
            ${disabled || !ready
              ? "bg-zinc-800 text-zinc-600 cursor-wait"
              : isPlaying
              ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50"
              : "bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 hover:border-red-600"
            }
          `}
        >
          {!ready ? (
            <svg className="w-5 h-5 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1"/>
              <rect x="14" y="5" width="4" height="14" rx="1"/>
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Waveform box — also hosts the (fully covered) YouTube player */}
        <div className="relative w-[200px] h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700">
          {/* YT player gets injected here, sized to fill the box */}
          <div ref={hostRef} className="absolute inset-0 w-full h-full" />
          {/* Opaque overlay — hides the video + title completely. Audio still plays. */}
          <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center gap-[3px] z-10">
            {Array.from({ length: 16 }).map((_, i) => {
              const h = Math.round(8 + Math.sin(i * 0.6) * 5);
              const hPlay = Math.round(18 + Math.sin(i * 0.8) * 10 + 6);
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors duration-300 ${
                    isPlaying ? "bg-red-500" : ready ? "bg-zinc-600" : "bg-zinc-800"
                  }`}
                  style={{
                    height: `${isPlaying ? hPlay : h}px`,
                    animation: isPlaying
                      ? `waveBar ${0.4 + (i % 5) * 0.08}s ${(i % 7) * 0.05}s ease-in-out infinite alternate`
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs font-mono text-zinc-500">
        {!ready ? "lädt…" : isFull ? "🎵 ganzer Song — letzter Versuch!" : `${snippetDuration}s snippet`}
      </div>
    </div>
  );
}
