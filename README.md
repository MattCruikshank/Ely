# Ely — Gaussian Splat viewer

Web viewer for a Gaussian Splat reconstruction of `Ely.mp4` (snowy forest clearing).

## Pipeline (all local, free)

1. **Frames** — `ffmpeg -i Ely.mp4 -vf fps=5 -qscale:v 2 work/images/f_%04d.jpg` (98 frames)
2. **Poses** — COLMAP 3.9.1: `feature_extractor` (single OPENCV camera) → `sequential_matcher` → `mapper`.
   Lay out as `work/dataset/{images,sparse/0}`.
3. **Train** — [Brush](https://github.com/ArthurBrussee/brush) v0.3.0 (`tools/brush`, not committed):
   `brush_app.exe work/dataset --total-steps 30000 --max-splats 2000000 --export-path work/train`
   Add `--with-viewer` to watch it train.
4. **Camera path** — `python tools/export_cameras.py <colmap txt model> web/public/cameras.json`
5. **Compress** — `cd web && npm run compress` (PLY → SPZ via `@playcanvas/splat-transform`)

## Viewer

[Spark](https://sparkjs.dev) (three.js) + Vite. Starts at the first video frame; **Play path** flies the
original camera trajectory.

```sh
cd web
npm install
npm run dev      # http://localhost:5180
npm run build    # static site in web/dist
```

Deployed to GitHub Pages by `.github/workflows/pages.yml` on push to `main`
(set Settings → Pages → Source: GitHub Actions).

Note: SOG output from splat-transform 3.12 renders corrupted in Spark 2.4 — use SPZ.
