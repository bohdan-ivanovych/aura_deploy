import { useRef, useState, useCallback, useEffect } from 'react';
import { track } from '@/lib/services/analytics';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ReelMessage {
  id: string;
  text: string;
  sender: 'USER' | 'AI';
  weaknessIdentified?: string | null;
}

export type ReelType = 'ROAST' | 'FLEX' | 'CONFESSION' | 'MIRROR' | 'CHALLENGE' | 'PROPHECY';
export type GenerationStage = 'idle' | 'analyzing' | 'composing' | 'audio' | 'encoding' | 'ready';

interface Props {
  messages: ReelMessage[];
  persona: { name: string; avatarUrl?: string | null; voiceId?: string | null };
  diveDepth: number;
}

// ─── Canvas constants ────────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const PAD_X = 52;
const BUBBLE_PAD_X = 44;
const BUBBLE_PAD_Y = 36;
const FONT_SIZE = 40;
const LINE_HEIGHT = 60;
const MSG_GAP = 28;
const TOP_PAD = 140;
const AVATAR_R = 34;
const PERSONA_LABEL_H = 88;
const RADIUS = 28;
const BUBBLE_MAX_W = W - PAD_X * 2 - 20;
const WORDS_PER_SEC_USER = 3.0;

const C = {
  bg: '#09090e',
  aiBg: 'rgba(255,255,255,0.065)',
  aiBorder: 'rgba(255,255,255,0.10)',
  userBg1: 'rgba(0,212,212,0.25)',
  userBg2: 'rgba(0,152,219,0.18)',
  userBorder: 'rgba(0,212,212,0.28)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.55)',
  accent: '#00d4d4',
  avatarBg: 'rgba(0,212,212,0.14)',
  avatarBorder: 'rgba(0,212,212,0.32)',
  avatarText: '#00d4d4',
  watermark: 'rgba(255,255,255,0.20)',
  headerBg: 'rgba(0,0,0,0.5)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wrapWords(ctx: CanvasRenderingContext2D, words: string[], count: number, maxW: number): string[] {
  const joined = words.slice(0, count).join(' ');
  if (!joined) return [];
  const ws = joined.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of ws) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function bubbleH(lines: number) { return Math.max(lines, 1) * LINE_HEIGHT + BUBBLE_PAD_Y * 2; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Sound helpers ────────────────────────────────────────────────────────────
function playChirp(audioCtx: AudioContext, dest: AudioNode, freq = 880) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.75, t + 0.09);
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain); gain.connect(dest); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.11);
}

function playBassDrop(audioCtx: AudioContext, dest: AudioNode) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.65);
  gain.gain.setValueAtTime(1.0, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  osc.connect(gain); gain.connect(dest); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 1.0);
}

function playAscendingDing(audioCtx: AudioContext, dest: AudioNode, idx: number) {
  const freqs = [523, 659, 784, 1047];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.value = freqs[idx % freqs.length];
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain); gain.connect(dest); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.31);
}

function playPianoNote(audioCtx: AudioContext, dest: AudioNode) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(261, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.4);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  osc.connect(gain); gain.connect(dest); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 0.61);
}

function playReverbTone(audioCtx: AudioContext, dest: AudioNode) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime;
  osc.type = 'sine';
  osc.frequency.value = 174;
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  osc.connect(gain); gain.connect(dest); gain.connect(audioCtx.destination);
  osc.start(t); osc.stop(t + 1.81);
}

// ─── Draw state ───────────────────────────────────────────────────────────────
interface MsgState { text: string; sender: 'USER' | 'AI'; words: string[]; wordsShown: number; weaknessIdentified?: string | null; }
interface DrawState {
  messages: MsgState[];
  scrollY: number;
  glitchAlpha: number;
  glitchShift: number;
  showHPBadge: boolean;
  hpBadgeScale: number;
  flashAlpha: number;
  flashColor: string;
  reelType: ReelType;
  diveDepth: number;
}

export function useReelGenerator({ messages, persona, diveDepth }: Props) {
  const [genStage, setGenStage] = useState<GenerationStage>('idle');
  const [genProgress, setGenProgress] = useState(0);
  const [webmBlob, setWebmBlob] = useState<Blob | null>(null);
  const [mp4Blob, setMp4Blob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const personaImgRef = useRef<HTMLImageElement | null>(null);

  const drawStateRef = useRef<DrawState>({
    messages: [], scrollY: 0, glitchAlpha: 0, glitchShift: 0,
    showHPBadge: false, hpBadgeScale: 0, flashAlpha: 0, flashColor: '#ff1744',
    reelType: 'ROAST', diveDepth,
  });

  // Preload avatar
  useEffect(() => {
    if (!persona.avatarUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { personaImgRef.current = img; };
    img.src = persona.avatarUrl;
  }, [persona.avatarUrl]);

  // Clean up
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      audioCtxRef.current?.close();
    };
  }, [videoUrl]);

  const drawFrame = useCallback((type: ReelType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = drawStateRef.current;
    const FONT = `500 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (type === 'FLEX') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, 'rgba(0,212,212,0.08)');
      grad.addColorStop(1, 'rgba(0,80,180,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (type === 'ROAST') {
      const glow = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, 800);
      glow.addColorStop(0, 'rgba(255,20,50,0.06)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    } else if (type !== 'MIRROR') {
      const topGlow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 800);
      topGlow.addColorStop(0, 'rgba(0,212,212,0.05)');
      topGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, W, 800);
    }

    if (s.flashAlpha > 0) {
      ctx.fillStyle = s.flashColor.replace(')', `,${s.flashAlpha})`).replace('rgb', 'rgba');
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = C.headerBg;
    ctx.fillRect(0, 0, W, 80);

    ctx.fillStyle = C.textMuted;
    ctx.font = `600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Speaking with ${persona.name}`, W / 2, 40);

    ctx.save();
    ctx.translate(0, -s.scrollY + 100);

    let curY = TOP_PAD;
    ctx.font = FONT;

    for (let i = 0; i < s.messages.length; i++) {
      const msg = s.messages[i];
      const isAI = msg.sender === 'AI';
      const words = msg.words;
      const shown = Math.min(msg.wordsShown, words.length);

      ctx.font = FONT;
      const maxTextW = BUBBLE_MAX_W - BUBBLE_PAD_X * 2;
      const fullLines = wrapWords(ctx, words, words.length, maxTextW);
      const shownLines = shown > 0 ? wrapWords(ctx, words, shown, maxTextW) : [];

      let longestLineW = 0;
      for (const l of fullLines) {
        const w = ctx.measureText(l).width;
        if (w > longestLineW) longestLineW = w;
      }
      const bW = Math.min(BUBBLE_MAX_W, longestLineW + BUBBLE_PAD_X * 2 + 24);
      const bH = bubbleH(fullLines.length);
      const labelH = isAI ? PERSONA_LABEL_H : 0;

      if (isAI) {
        const cx = PAD_X + AVATAR_R;
        const cy = curY + AVATAR_R;
        if (personaImgRef.current) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, AVATAR_R, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(personaImgRef.current, cx - AVATAR_R, cy - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, AVATAR_R, 0, Math.PI * 2);
          ctx.fillStyle = C.avatarBg;
          ctx.fill();
          ctx.strokeStyle = C.avatarBorder;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = C.avatarText;
          ctx.font = `700 26px -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(persona.name[0].toUpperCase(), cx, cy);
          ctx.font = FONT;
        }
        ctx.fillStyle = C.textMuted;
        ctx.font = `500 26px -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(persona.name, PAD_X + AVATAR_R * 2 + 16, curY + AVATAR_R);
        ctx.font = FONT;
        curY += PERSONA_LABEL_H;
      }

      const bX = isAI ? PAD_X : W - PAD_X - bW;
      const bY = curY;

      if (type === 'MIRROR' && !isAI && msg.weaknessIdentified) {
        ctx.save();
        roundRect(ctx, bX - 4, bY - 4, bW + 8, bH + 8, RADIUS + 4);
        ctx.strokeStyle = 'rgba(0,212,212,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      if (isAI) {
        ctx.fillStyle = C.aiBg;
        roundRect(ctx, bX, bY, bW, bH, RADIUS);
        ctx.fill();
        ctx.strokeStyle = C.aiBorder;
        ctx.lineWidth = 2;
        roundRect(ctx, bX, bY, bW, bH, RADIUS);
        ctx.stroke();
      } else {
        const userGrad = ctx.createLinearGradient(bX, bY, bX + bW, bY);
        userGrad.addColorStop(0, C.userBg1);
        userGrad.addColorStop(1, C.userBg2);
        ctx.fillStyle = userGrad;
        roundRect(ctx, bX, bY, bW, bH, RADIUS);
        ctx.fill();
        ctx.strokeStyle = C.userBorder;
        ctx.lineWidth = 2;
        roundRect(ctx, bX, bY, bW, bH, RADIUS);
        ctx.stroke();
      }

      if (type === 'ROAST' && !isAI && msg.weaknessIdentified) {
        ctx.fillStyle = 'rgba(255,20,50,0.25)';
        roundRect(ctx, bX, bY, bW, bH, RADIUS);
        ctx.fill();
      }

      ctx.fillStyle = C.text;
      ctx.font = FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let li = 0; li < shownLines.length; li++) {
        ctx.fillText(shownLines[li], bX + BUBBLE_PAD_X, bY + BUBBLE_PAD_Y + li * LINE_HEIGHT);
      }

      if (type === 'MIRROR' && msg.weaknessIdentified && shown === words.length) {
        ctx.fillStyle = C.accent;
        ctx.font = `700 28px -apple-system, sans-serif`;
        ctx.textAlign = isAI ? 'left' : 'right';
        const labelX = isAI ? bX : bX + bW;
        ctx.fillText(msg.weaknessIdentified.toUpperCase(), labelX, bY - 44);
        ctx.font = FONT;
      }

      if (type === 'ROAST' && msg.weaknessIdentified && shown === words.length && !isAI) {
        ctx.fillStyle = 'rgba(255,60,60,0.9)';
        ctx.font = `700 26px -apple-system, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`⚠ ${msg.weaknessIdentified}`, bX + bW, bY + bH + 20);
        ctx.font = FONT;
      }

      if (s.showHPBadge && !isAI && i === s.messages.length - 1 && msg.weaknessIdentified) {
        const bscale = s.hpBadgeScale;
        if (bscale > 0) {
          ctx.save();
          ctx.translate(bX + bW / 2, bY - 40);
          ctx.scale(bscale, bscale);
          roundRect(ctx, -90, -28, 180, 56, 20);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `800 30px -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('− HP', 0, 0);
          ctx.restore();
        }
      }

      curY += bH + labelH + MSG_GAP;
    }

    if (s.glitchAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = s.glitchAlpha;
      ctx.fillStyle = '#ff0040';
      ctx.fillRect(0, s.scrollY + 100 + 200, W, 6);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(0, s.scrollY + 100 + 210, W, 4);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.restore();
  }, [C, persona.name]);

  const recordVideo = useCallback(async (type: ReelType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = W;
    canvas.height = H;

    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const audioDest = audioCtx.createMediaStreamDestination();
      audioDestRef.current = audioDest;

      const videoStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);

      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6_000_000 });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      const s = drawStateRef.current;
      s.reelType = type;
      s.diveDepth = diveDepth;

      if (type === 'ROAST') {
        playBassDrop(audioCtx, audioDest);
      } else if (type === 'PROPHECY') {
        playReverbTone(audioCtx, audioDest);
      } else if (type === 'CONFESSION') {
        playPianoNote(audioCtx, audioDest);
      }

      setGenStage('audio');
      const ttsPromises = messages.map(async (msg) => {
        if (msg.sender === 'AI') {
          try {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: msg.text, voiceId: persona.voiceId }),
            });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              return await audioCtx.decodeAudioData(ab);
            }
          } catch {}
        }
        return null;
      });

      const ttsBuffers = await Promise.all(ttsPromises);

      setGenStage('encoding');
      recorder.start(100);

      s.messages = messages.map(m => ({
        text: m.text, sender: m.sender, words: m.text.split(' '), wordsShown: 0, weaknessIdentified: m.weaknessIdentified,
      }));
      s.scrollY = 0;
      s.glitchAlpha = 0;
      s.glitchShift = 0;
      s.showHPBadge = false;
      s.hpBadgeScale = 0;
      s.flashAlpha = 0;

      let startTime: number | null = null;
      let msgIdx = 0;
      let wordTimer = 0;
      let lastTimestamp = 0;

      const loop = async (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
        lastTimestamp = timestamp;

        const msg = s.messages[msgIdx];
        if (!msg) {
          if (timestamp - (startTime + 1000) > 1000) {
            cancelAnimationFrame(rafRef.current);
            recorder.stop();
            if (type === 'ROAST') {
              s.flashAlpha = 0.4;
              s.flashColor = 'rgb(255,20,50)';
              drawFrame(type);
              await new Promise(r => setTimeout(r, 300));
              s.flashAlpha = 0;
              drawFrame(type);
            }
            return;
          }
        } else if (msg.sender === 'USER') {
          wordTimer += dt;
          if (wordTimer > 1 / WORDS_PER_SEC_USER && msg.wordsShown < msg.words.length) {
            msg.wordsShown++;
            wordTimer = 0;
            if (msg.wordsShown === 1) playChirp(audioCtx, audioDest);

            if (type === 'ROAST' && msg.wordsShown === msg.words.length) {
              const hasError = messages[msgIdx]?.weaknessIdentified;
              if (hasError) {
                playBassDrop(audioCtx, audioDest);
                s.glitchAlpha = 0.8;
                s.flashAlpha = 0.35;
                s.flashColor = 'rgb(255,20,50)';
                setTimeout(() => { s.glitchAlpha = 0; s.flashAlpha = 0; }, 200);
                s.showHPBadge = true;
                s.hpBadgeScale = 0;
                const startScale = Date.now();
                const scaleUp = () => {
                  const p = Math.min((Date.now() - startScale) / 300, 1);
                  s.hpBadgeScale = p;
                  if (p < 1) requestAnimationFrame(scaleUp);
                };
                scaleUp();
              }
            } else if (type === 'FLEX' && msg.wordsShown === msg.words.length) {
              playAscendingDing(audioCtx, audioDest, msgIdx);
            } else if (type === 'CONFESSION' && msg.wordsShown === msg.words.length && msgIdx === 0) {
              playPianoNote(audioCtx, audioDest);
            }
          }
          if (msg.wordsShown >= msg.words.length) {
            await new Promise(r => setTimeout(r, 400));
            msgIdx++;
            wordTimer = 0;
            s.showHPBadge = false;
          }
        } else if (msg.sender === 'AI') {
          const buf = ttsBuffers[msgIdx];
          if (msg.wordsShown === 0 && buf) {
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            src.connect(audioDest);
            src.connect(audioCtx.destination);
            src.start();
            const wordCount = msg.words.length;
            const dur = buf.duration;
            const wps = wordCount / dur;
            const revealInterval = setInterval(() => {
              if (msg.wordsShown < wordCount) {
                msg.wordsShown = Math.min(msg.wordsShown + 1, wordCount);
              } else {
                clearInterval(revealInterval);
              }
            }, 1000 / wps);
            msg.wordsShown = 1;
            await new Promise(r => src.addEventListener('ended', r));
            clearInterval(revealInterval);
            msg.wordsShown = wordCount;
            await new Promise(r => setTimeout(r, 600));
            msgIdx++;
            wordTimer = 0;
          } else if (!buf) {
            wordTimer += dt;
            if (wordTimer > 1 / (WORDS_PER_SEC_USER * 1.2)) {
              if (msg.wordsShown < msg.words.length) { msg.wordsShown++; wordTimer = 0; }
            }
            if (msg.wordsShown >= msg.words.length) {
              await new Promise(r => setTimeout(r, 600));
              msgIdx++;
              wordTimer = 0;
            }
          }
        }

        const ctx2 = canvas.getContext('2d');
        if (ctx2) {
          const approxY = msgIdx * 200;
          const targetScroll = Math.max(0, approxY - H * 0.5 + 200);
          s.scrollY += (targetScroll - s.scrollY) * 0.08;
        }

        if (type === 'PROPHECY' && msg?.sender === 'AI' && msg.wordsShown > 0 && msg.wordsShown % 5 === 0) {
          playReverbTone(audioCtx, audioDest);
        }

        drawFrame(type);
        rafRef.current = requestAnimationFrame(loop);
      };

      drawFrame(type);
      rafRef.current = requestAnimationFrame(loop);

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setWebmBlob(blob);
        setGenStage('ready');
        setGenProgress(1);

        try {
          const formData = new FormData();
          formData.append('video', blob, 'reel.webm');
          const res = await fetch('/api/convert-video', { method: 'POST', body: formData });
          if (res.ok) {
            const mp4 = await res.blob();
            setMp4Blob(mp4);
            const url = URL.createObjectURL(mp4);
            setVideoUrl(url);
          } else {
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
          }
        } catch {
          const url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }

        await audioCtx.close();
        track('reel_generated', { type });
      };
    } catch (err) {
      toast.error('Failed to generate reel');
      setGenStage('idle');
    }
  }, [messages, persona, diveDepth, drawFrame]);

  const startGeneration = useCallback(async (type: ReelType) => {
    setGenProgress(0);
    const stages: GenerationStage[] = ['analyzing', 'composing', 'audio', 'encoding', 'ready'];
    const durations = [1800, 2200, 1600, 1800, 400];

    for (let i = 0; i < stages.length - 1; i++) {
      setGenStage(stages[i]);
      const start = Date.now();
      const dur = durations[i];
      const baseProgress = (i / (stages.length - 1)) * 0.9;
      const nextProgress = ((i + 1) / (stages.length - 1)) * 0.9;

      await new Promise<void>(resolve => {
        const animate = () => {
          const elapsed = Date.now() - start;
          const p = Math.min(elapsed / dur, 1);
          setGenProgress(baseProgress + (nextProgress - baseProgress) * p);
          if (p < 1) rafRef.current = requestAnimationFrame(animate);
          else resolve();
        };
        rafRef.current = requestAnimationFrame(animate);
      });
    }
    await recordVideo(type);
  }, [recordVideo]);

  const reset = useCallback(() => {
    setVideoUrl(null);
    setWebmBlob(null);
    setMp4Blob(null);
    setGenStage('idle');
    setGenProgress(0);
  }, []);

  return {
    genStage,
    genProgress,
    videoUrl,
    webmBlob,
    mp4Blob,
    canvasRef,
    startGeneration,
    reset
  };
}
