## Goal

Make the shell outline disappear on first click with the same gentle ease used when it reappears on second click. Right now open uses a fast cubic bloom that flies past the viewport; close uses a smooth lerp toward 0. We'll replace open with the symmetric inverse of close.

## Change (single file)

`src/components/Waves.tsx` — eye-state block inside `frame()`:

1. **Remove the bloom branch entirely.** Delete `s.bloomActive`, `s.bloomClock`, `s.radiusAtClick`, and the cubic-ease bloom math. Also remove the `bloomActive = true` / `radiusAtClick = s.eyeR` / `bloomClock = 0` setup in `onUp` (open branch), and the `s.bloomActive = false` in the close branch.

2. **Open uses the same lerp as close, just toward a large target.** Define a single `maxOpenR = 1.5 * Math.max(W, H)` and ease `eyeR` toward it with the same 0.1 factor that close uses to ease toward 0:

   ```ts
   const maxR = Math.min(130, W * 0.22);
   const maxOpenR = 1.5 * Math.max(W, H);
   const targetR = s.isOpen ? maxOpenR : (s.active ? maxR : 0);
   s.eyeR += (targetR - s.eyeR) * 0.1;
   ```

   This naturally produces a gentle outward glide on open and a gentle inward glide on close — perfectly symmetric.

3. **Eye center logic unchanged** (already eases to viewport center on open, follows cursor when closed).

4. **`openProgress` unchanged** (still ramps 0↔1 at ±0.05/frame for paper + thread fades).

5. **Reduced-motion branch in `onUp` unchanged** (still snaps `eyeR` to viewport size on open, 0 on close).

6. **Clean up `State` interface** — drop `bloomActive`, `bloomClock`, `radiusAtClick` fields and their initializers.

## Untouched

Shell path, threads/lashes, paper fade, video element, pointer handlers (except the bloom-setup lines noted above), cursor swap, reduced-motion path.

## Result

First click: shell outline glides outward smoothly past viewport edges at the same rate it glides back inward on second click. No more snappy cubic bloom.
