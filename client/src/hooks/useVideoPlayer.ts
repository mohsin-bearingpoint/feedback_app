"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  buffered: number;
}

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    buffered: 0,
  });

  // Sync playback state from video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () =>
      setState((s) => ({ ...s, currentTime: video.currentTime }));

    const onLoadedMetadata = () =>
      setState((s) => ({ ...s, duration: video.duration }));

    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnded = () =>
      setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));

    const onVolumeChange = () =>
      setState((s) => ({
        ...s,
        volume: video.volume,
        isMuted: video.muted,
      }));

    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setState((s) => ({ ...s, buffered: bufferedEnd }));
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("progress", onProgress);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("progress", onProgress);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setState((s) => ({ ...s, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const play = useCallback(() => {
    videoRef.current?.play();
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(vol, 1));
    video.muted = vol === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  return {
    videoRef,
    containerRef,
    state,
    togglePlay,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
  };
}
