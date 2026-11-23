# Ely

Static web viewer for a Gaussian Splat reconstruction of `Ely.mp4` (a ~20 s handheld walk through a
snowy forest clearing). Live at https://mattcruikshank.github.io/Ely/ — deployed by
`.github/workflows/pages.yml` on every push to `main`.

## Layout

- `web/` — the viewer: Vite + three.js + Spark (`@sparkjsdev/spark` 2.x). All logic is in `web/src/main.js`.
  - `web/public/scene.spz` — the splat (2M Gaussians, SH degree 3, ~47 MB).
  - `web/public/cameras.json` — original video camera path (COLMAP poses, already in three.js coords) + `fovY`.
- `tools/export_cameras.py` — COLMAP TXT model → `cameras.json`.
- `work/`, `tools/brush/`, `target/` — local-only, gitignored (frames, COLMAP db, training checkpoints, Brush binary,
  Brush autotune cache). Regenerate via the pipeline in `README.md`; the source video is not in the repo.

## Commands

```sh
cd web
npm run dev      # http://localhost:5180 (5173 is taken by something else on this machine)
npm run build    # -> web/dist
npm run compress # work/train/export_30000.ply -> public/scene.spz
```

`?splat=<url>` on the viewer URL loads a different splat file — handy for comparing checkpoints.

## Gotchas

- **Use SPZ, not SOG.** SOG from `@playcanvas/splat-transform` 3.12 renders as corrupted streaks in Spark 2.4
  (GPU or CPU encode). SPZ is correct.
- **Coordinates:** COLMAP is y-down/z-forward. The splat is rotated 180° about X (`quaternion (1,0,0,0)`) and
  `export_cameras.py` applies the same flip (negate y, z), so the two must stay in sync.
- **File size:** GitHub warns at 50 MB and rejects at 100 MB per file. Keep `scene.spz` under 50 MB
  (cap Brush with `--max-splats`, or drop SH bands with `splat-transform -H 1`).
- **CI uses `npm install`, not `npm ci`:** the lockfile is generated on Windows and misses Linux-only optional
  deps that Vite 8 needs.
- Brush writes a `target/autotune` cache into its working directory.
- The old `SplatWorld/venv_nerfstudio` (torch cu124) does not support the RTX 5070 Ti (Blackwell); Brush avoids
  PyTorch entirely. COLMAP 3.9.1 lives at `../SplatWorld/tools/colmap/` and works with GPU SIFT.

## Verifying changes

Screenshot the page with headless Chrome via puppeteer-core (`--use-angle=d3d11 --enable-gpu`), waiting for
`#loading.done`. Headless `--virtual-time-budget` screenshots capture only the loading screen.
