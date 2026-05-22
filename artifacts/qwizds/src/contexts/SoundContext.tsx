import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

interface SoundCtx {
  playTick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  playCountdownEnd: () => void;
  playPodium: (place: 1 | 2 | 3) => void;
  startGameMusic: () => void;
  stopGameMusic: () => void;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
}

const SoundContext = createContext<SoundCtx | null>(null);

const BPM = 130;
const BEAT = 60 / BPM;
const EIGHTH = BEAT / 2;

const MELODY: number[] = [
  523.25, 659.25, 523.25, 440.00, 392.00, 440.00, 659.25, 523.25,
  659.25, 783.99, 659.25, 523.25, 587.33, 523.25, 440.00, 392.00,
];
const BASS: number[] = [130.81, 130.81, 174.61, 196.00];

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(
    () => localStorage.getItem("qwizds_music") !== "off"
  );
  const [sfxEnabled, setSfxEnabled] = useState(
    () => localStorage.getItem("qwizds_sfx") !== "off"
  );

  const ctxRef      = useRef<AudioContext | null>(null);
  const masterRef   = useRef<GainNode | null>(null);
  const musicRef    = useRef<GainNode | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextTimeRef = useRef(0);
  const beatIdxRef  = useRef(0);
  const activeRef   = useRef(false);
  const sfxRef      = useRef(sfxEnabled);
  const musRef      = useRef(musicEnabled);

  useEffect(() => { sfxRef.current = sfxEnabled; }, [sfxEnabled]);
  useEffect(() => { musRef.current = musicEnabled; }, [musicEnabled]);

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  function dest(): AudioNode { getCtx(); return masterRef.current!; }

  function kick(ctx: AudioContext, d: AudioNode, t: number) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(d);
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.2);
  }

  function snare(ctx: AudioContext, d: AudioNode, t: number) {
    const len = Math.ceil(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 2200;
    const g = ctx.createGain();
    src.connect(f); f.connect(g); g.connect(d);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.start(t); src.stop(t + 0.1);
  }

  function hat(ctx: AudioContext, d: AudioNode, t: number, vol = 0.14) {
    const len = Math.ceil(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 9000;
    const g = ctx.createGain();
    src.connect(f); f.connect(g); g.connect(d);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    src.start(t); src.stop(t + 0.04);
  }

  function melody(ctx: AudioContext, d: AudioNode, t: number, idx: number) {
    const f = MELODY[idx % MELODY.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(d);
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + EIGHTH * 0.82);
    o.start(t); o.stop(t + EIGHTH * 0.88);
  }

  function bass(ctx: AudioContext, d: AudioNode, t: number, idx: number) {
    const f = BASS[idx % BASS.length];
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(d);
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.82);
    o.start(t); o.stop(t + BEAT * 0.88);
  }

  const schedRef = useRef(() => {});
  schedRef.current = () => {
    const ctx = ctxRef.current;
    const d = musicRef.current;
    if (!ctx || !d || !activeRef.current) return;
    const AHEAD = 0.22;
    while (nextTimeRef.current < ctx.currentTime + AHEAD) {
      const t   = nextTimeRef.current;
      const sub = beatIdxRef.current;
      const sib = sub % 8;
      const bar = Math.floor(sub / 8);
      if (sib === 0 || sib === 4) kick(ctx, d, t);
      if (sib === 2 || sib === 6) snare(ctx, d, t);
      hat(ctx, d, t, sib % 2 === 0 ? 0.17 : 0.1);
      melody(ctx, d, t, sub);
      if (sib === 0 || sib === 4) bass(ctx, d, t, bar * 2 + (sib === 4 ? 1 : 0));
      nextTimeRef.current += EIGHTH;
      beatIdxRef.current++;
    }
  };

  const playTick = useCallback(() => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dest());
    o.type = "sine"; o.frequency.value = 900;
    g.gain.setValueAtTime(0.13, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    o.start(); o.stop(ctx.currentTime + 0.08);
  }, []);

  const playCorrect = useCallback(() => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(dest());
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0.17, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.22);
    });
  }, []);

  const playWrong = useCallback(() => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dest());
    o.type = "sawtooth";
    o.frequency.setValueAtTime(260, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.38);
    g.gain.setValueAtTime(0.13, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    o.start(); o.stop(ctx.currentTime + 0.4);
  }, []);

  const playCountdownEnd = useCallback(() => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    [660, 440, 330].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(dest());
      o.type = "square"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.28);
    });
  }, []);

  const playPodium = useCallback((place: 1 | 2 | 3) => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    const patterns: Record<number, number[]> = {
      3: [523.25, 587.33, 659.25],
      2: [659.25, 698.46, 783.99],
      1: [523.25, 659.25, 783.99, 1046.50],
    };
    const notes = patterns[place];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(dest());
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.15;
      const vol = place === 1 ? 0.25 : 0.18;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.35);
    });
  }, []);

  const playClick = useCallback(() => {
    if (!sfxRef.current) return;
    const ctx = getCtx();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(dest());
    o.type = "sine"; o.frequency.value = 680;
    g.gain.setValueAtTime(0.055, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    o.start(); o.stop(ctx.currentTime + 0.04);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("button") || el.closest('[role="button"]')) playClick();
    };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, [playClick]);

  const startGameMusic = useCallback(() => {
    if (!musRef.current || activeRef.current) return;
    const ctx = getCtx();
    if (!musicRef.current) {
      musicRef.current = ctx.createGain();
      musicRef.current.connect(dest());
    }
    musicRef.current.gain.setValueAtTime(0, ctx.currentTime);
    musicRef.current.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 2);
    nextTimeRef.current = ctx.currentTime + 0.08;
    beatIdxRef.current = 0;
    activeRef.current = true;
    timerRef.current = setInterval(() => schedRef.current(), 25);
  }, []);

  const stopGameMusic = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (musicRef.current && ctxRef.current) {
      musicRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1.2);
    }
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(v => {
      const next = !v;
      localStorage.setItem("qwizds_music", next ? "on" : "off");
      musRef.current = next;
      if (!next) stopGameMusic();
      return next;
    });
  }, [stopGameMusic]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(v => {
      const next = !v;
      localStorage.setItem("qwizds_sfx", next ? "on" : "off");
      sfxRef.current = next;
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{
      playTick, playCorrect, playWrong, playCountdownEnd, playPodium,
      startGameMusic, stopGameMusic,
      musicEnabled, sfxEnabled, toggleMusic, toggleSfx,
    }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundCtx {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
