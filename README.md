# Ocean Bloom

Render the following code as the main page for a new project:

/**

 * Waves.jsx — Ocean thread fabric with starfish video reveal

 *

 * Wrap in a full-height container:

 *   <div style={{ width: "100vw", height: "100vh" }}>

 *     <Waves />

 *   </div>

 *

 * Requires React + Tailwind CSS. No other dependencies.

 */

import { useEffect, useRef, useState } from "react";

/* ── SVG cursor ──────────────────────────────────────────────────────── */

function svgCursor(label) {

  const W = label.length * 7.5 + 12;

  const H = 20;

  const svg =

    `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>` +

    `<text x='${W / 2}' y='14' font-family='monospace' font-size='11' font-weight='700'` +

    ` text-anchor='middle' letter-spacing='1.2'` +

    ` stroke='#008CA8' stroke-width='3' paint-order='stroke fill' fill='#7DD2E3'>` +

    label +

    `</text></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${W / 2} 7, pointer`;

}

const CURSOR_CLICK = svgCursor("CLICK");

const CURSOR_CLOSE = svgCursor("CLOSE");

/* ── Easing ──────────────────────────────────────────────────────────── */

function easeInOutCubic(t) {

  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

}

/* ── Eye path (world coords — no ctx.translate needed) ───────────────── */

/** Chunky 5-arm starfish — fat convex arms, shallow valleys */

function drawStarPath(ctx, cx, cy, r) {

  const N     = 5;

  const outer = r;

  const inner = r * 0.42;          // valley depth — chunky but distinct

  const start = -Math.PI / 2;      // first arm tip points up

  const step  = Math.PI / N;       // angle between each tip/valley

  // Build the 10 alternating tip / valley points

  const pts = [];

  for (let i = 0; i < N * 2; i++) {

    const a   = start + i * step;

    const rad = i % 2 === 0 ? outer : inner;

    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);

  }

  ctx.beginPath();

  ctx.moveTo(pts[0][0], pts[0][1]);

  for (let i = 0; i < pts.length; i++) {

    const [px, py] = pts[i];

    const [qx, qy] = pts[(i + 1) % pts.length];

    // Control point = midpoint from center, scaled to push arm sides

    // outward (convex) and valley sides slightly inward (defined valleys)

    const mx  = (px + qx) / 2 - cx;

    const my  = (py + qy) / 2 - cy;

    const fac = i % 2 === 0 ? 1.18 : 0.86;  // arm side / valley side

    ctx.quadraticCurveTo(cx + mx * fac, cy + my * fac, qx, qy);

  }

  ctx.closePath();

}

/* ── Component ───────────────────────────────────────────────────────── */

export default function Waves() {

  const containerRef  = useRef(null);

  const canvasRef     = useRef(null);

  const videoRef      = useRef(null);

  const staticFnRef   = useRef(null); // drawStatic, for reduced-motion close

  const [isOpen, setIsOpen] = useState(false);

  /**

   * All mutable animation state lives in one stable object so the RAF

   * closure always sees fresh values without extra re-renders.

   */

  const s = useRef({

    cssW: 0, cssH: 0,

    threads: [], P: 48, spacing: 11,

    active: false,

    px: -9999, py: -9999,

    eyeX: 0, eyeY: 0, eyeR: 0,

    isOpen: false,

    openProgress: 0,

    bloomActive: false,

    bloomClock: 0,

    radiusAtClick: 0,

    veilAlpha: 0,

    scanX: 0,

    downX: 0, downY: 0, downTime: 0,

    pauseTimer: null,

    rafId: null,

    rm: false,

  }).current;

  /* ── Canvas / physics setup ─────────────────────────────────────────── */

  useEffect(() => {

    const canvas = canvasRef.current;

    const video  = videoRef.current;

    s.rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Ocean palette — each thread picks one at random on build */

    const PALETTE = ["#E3F8FF", "#084A96", "#103052", "#87D7FF", "#CCECFF", "#2EBCE6", "#E8FFFD"];

    /* Build thread arrays */

    function buildThreads(W, H) {

      const sp = W < 640 ? 22 : 11;

      s.spacing = sp;

      s.cssW = W;

      s.cssH = H;

      const n = Math.ceil(H / sp) + 2;

      s.threads = Array.from({ length: n }, (_, i) => ({

        restY: i * sp,

        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],

        off: new Float32Array(s.P), // vertical offset per control point

        vel: new Float32Array(s.P), // velocity per control point

        tmp: new Float32Array(s.P), // new-velocity scratch buffer (two-pass)

      }));

    }

    /* Static frame for reduced-motion / post-close */

    function drawStatic() {

      const ctx = canvas.getContext("2d");

      const { cssW: W, cssH: H, threads, P } = s;

      if (!W) return;

      ctx.clearRect(0, 0, W, H);

      ctx.save();

      ctx.fillStyle = "#008CA8";

      ctx.fillRect(0, 0, W, H);

      ctx.lineWidth = 1;

      ctx.globalAlpha = 0.5;

      ctx.lineCap = "round";

      ctx.setLineDash([1.6, 5.5]);

      for (const th of threads) {

        ctx.strokeStyle = th.color;

        ctx.beginPath();

        for (let p = 0; p < P; p++) {

          const x = (p / (P - 1)) * W;

          if (p === 0) ctx.moveTo(x, th.restY);

          else         ctx.lineTo(x, th.restY);

        }

        ctx.stroke();

      }

      ctx.restore();

    }

    staticFnRef.current = drawStatic;

    /* Resize handler — measures the canvas's own bounding box */

    function resize() {

      const r = canvas.getBoundingClientRect();

      if (r.width === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width  = Math.floor(r.width  * dpr);

      canvas.height = Math.floor(r.height * dpr);

      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

      buildThreads(r.width, r.height);

      if (s.rm) drawStatic();

    }

    /* ── Main render frame ─────────────────────────────────────────── */

    function frame() {

      const ctx = canvas.getContext("2d");

      const { cssW: W, cssH: H, threads, P } = s;

      if (!threads.length || W === 0) return;

      /* ── STRING PHYSICS (two-pass integration) ─────────────────── */

      if (!s.rm) {

        const SIG    = 120;

        const MAX_DY = SIG * 2.2;

        for (const th of threads) {

          const { restY, off, vel, tmp } = th;

          const dyT  = restY - s.py;

          const inR  = s.active && Math.abs(dyT) < MAX_DY;

          const sign = restY > s.py ? 1 : -1;

          /* Pass 1 — read frozen `off`, write only `tmp` (new velocities) */

          for (let p = 1; p < P - 1; p++) {

            let a = 0.32 * (off[p - 1] + off[p + 1] - 2 * off[p]) - 0.012 * off[p];

            if (inR) {

              const dx = ((p / (P - 1)) * W - s.px) / 1.7;

              a += sign * Math.exp(-(dyT * dyT + dx * dx) / (SIG * SIG)) * 2.3;

            }

            tmp[p] = (vel[p] + a) * 0.962;

          }

          /* Pass 2 — apply new velocities and advance offsets */

          for (let p = 1; p < P - 1; p++) {

            vel[p]  = tmp[p];

            off[p] += vel[p];

          }

          // endpoints are pinned

          off[0] = vel[0] = off[P - 1] = vel[P - 1] = 0;

        }

      }

      /* ── EYE STATE ──────────────────────────────────────────────── */

      if (!s.rm) {

        const maxR = Math.min(100, W * 0.22); // star outer radius at hover

        if (s.bloomActive) {

          // Time-based bloom (easeInOutCubic over 84 frames ≈ 1.4 s)

          s.bloomClock = Math.min(1, s.bloomClock + 1 / 84);

          const maxBloom = 1.5 * Math.max(W, H);

          s.eyeR = s.radiusAtClick +

            (maxBloom - s.radiusAtClick) * easeInOutCubic(s.bloomClock);

          if (s.bloomClock >= 1) s.bloomActive = false;

        } else if (!s.isOpen) {

          // Normal pointer tracking — ease toward cursor or 0

          s.eyeR += ((s.active ? maxR : 0) - s.eyeR) * 0.1;

        }

        // When isOpen and bloom is done, eyeR stays at its bloomed value.

        // Eye center

        if (s.isOpen) {

          // Ease to viewport center

          s.eyeX += (W / 2 - s.eyeX) * 0.08;

          s.eyeY += (H / 2 - s.eyeY) * 0.08;

          s.openProgress = Math.min(1, s.openProgress + 0.05);

        } else {

          if (s.active) {

            // Follow pointer

            s.eyeX += (s.px - s.eyeX) * 0.25;

            s.eyeY += (s.py - s.eyeY) * 0.25;

          }

          s.openProgress = Math.max(0, s.openProgress - 0.05);

        }

      }

      /* ── DRAW ───────────────────────────────────────────────────── */

      ctx.clearRect(0, 0, W, H);

      // 1 — Paper fill

      ctx.save();

      ctx.globalCompositeOperation = "source-over";

      ctx.globalAlpha = 1;

      ctx.fillStyle = "#008CA8";

      ctx.fillRect(0, 0, W, H);

      ctx.restore();

      const eyeVisible = !s.rm && s.eyeR > 0.5;

      // 2 — Eye cut (destination-out) — drawn BEFORE threads so

      //     thread strokes overlay the opening like lashes

      if (eyeVisible) {

        ctx.save();

        ctx.globalCompositeOperation = "destination-out";

        ctx.globalAlpha = 1;

        drawStarPath(ctx, s.eyeX, s.eyeY, s.eyeR);

        ctx.fill();

        ctx.restore();

        // 3 — Loading veil + scan line (clipped to eye shape)

        const vidReady = video.readyState >= 2;

        s.veilAlpha = vidReady

          ? Math.max(0, s.veilAlpha - 0.05)

          : Math.min(1, s.veilAlpha + 0.05);

        if (s.veilAlpha > 0.004) {

          ctx.save();

          ctx.globalCompositeOperation = "source-over";

          drawStarPath(ctx, s.eyeX, s.eyeY, s.eyeR);

          ctx.clip(); // restrict subsequent draws to the eye shape

          // Ink fill

          ctx.globalAlpha = s.veilAlpha;

          ctx.fillStyle = "#7DD2E3";

          ctx.fillRect(0, 0, W, H);

          // Scan line — paper-colored vertical stripe drifting across

          const ew = s.eyeR * 1.9;

          s.scanX = (s.scanX + 1.6) % (ew * 2);

          ctx.globalAlpha = 0.4;

          ctx.strokeStyle = "#008CA8";

          ctx.lineWidth = 1.6;

          ctx.setLineDash([3, 8]);

          ctx.lineCap = "round";

          ctx.beginPath();

          const sx = s.eyeX - ew + s.scanX;

          ctx.moveTo(sx, 0);

          ctx.lineTo(sx, H);

          ctx.stroke();

          ctx.restore();

        }

      }

      // 4 — Thread fabric (drawn last → lashes over the eye opening)

      const tAlpha = s.rm ? 0.5 : 0.5 * (1 - s.openProgress);

      if (tAlpha > 0.005) {

        ctx.save();

        ctx.globalCompositeOperation = "source-over";

        ctx.lineWidth = 1;

        ctx.lineCap = "round";

        ctx.setLineDash([1.6, 5.5]);

        ctx.globalAlpha = tAlpha;

        for (const th of threads) {

          ctx.strokeStyle = th.color;

          ctx.beginPath();

          for (let p = 0; p < P; p++) {

            const x = (p / (P - 1)) * W;

            const y = th.restY + (s.rm ? 0 : th.off[p]);

            if (p === 0) ctx.moveTo(x, y);

            else         ctx.lineTo(x, y);

          }

          ctx.stroke();

        }

        ctx.restore();

      }

    }

    /* ── Animation loop ─────────────────────────────────────────── */

    function loop() {

      frame();

      s.rafId = requestAnimationFrame(loop);

    }

    /* ── Boot ────────────────────────────────────────────────────── */

    const ro = new ResizeObserver(resize);

    ro.observe(canvas);

    resize();

    if (!s.rm) s.rafId = requestAnimationFrame(loop);

    return () => {

      ro.disconnect();

      if (s.rafId)      cancelAnimationFrame(s.rafId);

      if (s.pauseTimer) clearTimeout(s.pauseTimer);

    };

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Pointer handlers ─────────────────────────────────────────────── */

  function onMove(e) {

    const rect = containerRef.current.getBoundingClientRect();

    s.px = e.clientX - rect.left;

    s.py = e.clientY - rect.top;

    if (!s.active) {

      s.active = true;

      // Snap eye to cursor on first entry (no lerp jump from 0,0)

      s.eyeX = s.px;

      s.eyeY = s.py;

      if (s.pauseTimer) { clearTimeout(s.pauseTimer); s.pauseTimer = null; }

      // Start video on first interaction

      videoRef.current?.play().catch(() => {});

    }

  }

  function onLeave() {

    s.active = false;

    s.px = -9999;

    s.py = -9999;

    // Pause video 800 ms after pointer leaves (only if not in full-reveal)

    if (!s.isOpen) {

      s.pauseTimer = setTimeout(() => {

        videoRef.current?.pause();

        s.pauseTimer = null;

      }, 800);

    }

  }

  function onDown(e) {

    const rect = containerRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left;

    const y = e.clientY - rect.top;

    s.downX = x; s.downY = y; s.downTime = Date.now();

    // Pluck impulse — velocity kick to nearby control points

    if (!s.rm && s.threads.length) {

      const { threads, P, cssW: W } = s;

      for (const th of threads) {

        const dy   = th.restY - y;

        const sign = th.restY > y ? 1 : -1;

        for (let p = 1; p < P - 1; p++) {

          const dx = (p / (P - 1)) * W - x;

          const d2 = dx * dx + dy * dy;

          if (d2 < 4 * 90 * 90) {

            th.vel[p] += sign * Math.exp(-d2 / (90 * 90)) * 9;

          }

        }

      }

    }

  }

  function onUp(e) {

    const rect = containerRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left;

    const y = e.clientY - rect.top;

    // Clean click = released within 8 px and 350 ms of press

    const isClick =

      Math.hypot(x - s.downX, y - s.downY) < 8 &&

      Date.now() - s.downTime < 350;

    if (!isClick) return;

    s.isOpen = !s.isOpen;

    setIsOpen(s.isOpen); // update cursor

    if (s.isOpen) {

      // — Open —

      if (s.rm) {

        // Reduced motion: instant cut

        s.eyeR = 1.5 * Math.max(s.cssW, s.cssH);

        s.openProgress = 1;

      } else {

        // Full bloom animation

        s.radiusAtClick = s.eyeR;

        s.bloomClock    = 0;

        s.bloomActive   = true;

      }

      if (s.pauseTimer) { clearTimeout(s.pauseTimer); s.pauseTimer = null; }

      videoRef.current?.play().catch(() => {});

    } else {

      // — Close —

      s.bloomActive = false;

      if (s.rm) {

        // Reduced motion: instant restore

        s.eyeR = 0;

        s.openProgress = 0;

        videoRef.current?.pause();

        staticFnRef.current?.(); // redraw static frame (no RAF running)

      } else if (!s.active) {

        // Pause video once eye has sealed shut

        s.pauseTimer = setTimeout(() => {

          videoRef.current?.pause();

          s.pauseTimer = null;

        }, 800);

      }

    }

  }

  /* ── Render ───────────────────────────────────────────────────────── */

  return (

    <div

      ref={containerRef}

      className="relative w-full h-full overflow-hidden"

      style={{ touchAction: "none", cursor: isOpen ? CURSOR_CLOSE : CURSOR_CLICK }}

      onPointerMove={onMove}

      onPointerLeave={onLeave}

      onPointerCancel={onLeave}

      onPointerDown={onDown}

      onPointerUp={onUp}

    >

      {/* Screen-reader label */}

      <h1 className="sr-only">Waves — interactive ocean thread fabric</h1>

      {/* ── Layer 1: video (bottom) ───────────────────────────────── */}

      <video

        ref={videoRef}

        className="absolute inset-0 w-full h-full object-cover"

        src="https://assets.mixkit.co/videos/44974/44974-720.mp4"

        muted

        loop

        playsInline

        preload="metadata"

        aria-hidden="true"

        tabIndex={-1}

      />

      {/* ── Layer 2: paper + threads + eye (top) ──────────────────── */}

      <canvas

        ref={canvasRef}

        className="absolute inset-0 w-full h-full"

        aria-hidden="true"

        tabIndex={-1}

      />

    </div>

  );

}

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wave-gaze.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d4cb9f2-1429-410a-913c-de8672b7ed23).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
