# Reveal the full video on click

## What's happening
The teal "stripes" in the screenshot aren't threads or the scan-line overlay — they're the **gaps between the shell's lobes**. The shell shape (`drawStarPath`) is built from ~5 petal lobes with intentional ~14% gaps between them. Step 2 of `frame()` cuts only those lobes out of the teal paper background (step 1), so the gaps between lobes remain filled with teal. When the shell blooms to fill the screen, those gaps stretch into the wide vertical teal bands you see.

The dashed thread "lashes" (step 4) already fade out correctly via `tAlpha = 0.5 * (1 - openProgress)`, so they're not the problem.

## Fix
In `src/components/Waves.tsx`, skip the teal paper fill (step 1) once the shell is fully bloomed open, so the video shows through the entire viewport with no teal anywhere.

Change step 1 from an unconditional `fillRect` to:

```ts
// 1 — Paper fill (skip once shell is fully bloomed → video fills viewport)
const paperAlpha = s.isOpen ? Math.max(0, 1 - s.openProgress * 1.05) : 1;
if (paperAlpha > 0.004) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = paperAlpha;
  ctx.fillStyle = "#008CA8";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
```

This keeps the paper fully opaque during the hover/closed state and during the bloom animation, then fades it to zero as `openProgress` reaches 1 — so the gaps between lobes disappear along with the rest of the paper. On close, paper instantly returns (since `isOpen` flips back to false).

Step 2's eye-cut becomes a no-op when there's nothing to cut, which is fine. Step 3 (loading veil / scan line) still runs only while the video buffers and is clipped to the shell, so it disappears as soon as the video is ready — unchanged behavior.

## Untouched
- Threads / lashes (step 4)
- Shell shape, bloom animation, pointer logic
- Closed-state appearance
- Video element

## Files
- `src/components/Waves.tsx` — replace the ~6-line step 1 block (lines ~318–324)
