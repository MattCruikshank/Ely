import * as THREE from "three";
import { SparkControls, SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

const BASE = import.meta.env.BASE_URL;
const SPLAT_URL = new URLSearchParams(location.search).get("splat") ?? `${BASE}scene.spz`;
const CAMERAS_URL = `${BASE}cameras.json`;
const PATH_SECONDS = 20; // roughly the length of the source video

const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f12);
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 1000);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

const controls = new SparkControls({ canvas });

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---- Splat ---------------------------------------------------------------
const fill = document.getElementById("fill");
const pct = document.getElementById("pct");
const splat = new SplatMesh({
  url: SPLAT_URL,
  onProgress: (e) => {
    if (e.lengthComputable) {
      const p = Math.round((e.loaded / e.total) * 100);
      fill.style.width = `${p}%`;
      pct.textContent = `${p}%`;
    }
  },
});
// COLMAP is y-down / z-forward; flip 180deg about X to get three.js y-up.
splat.quaternion.set(1, 0, 0, 0);
scene.add(splat);
splat.initialized.then(() => document.getElementById("loading").classList.add("done"));

// ---- Original camera path ------------------------------------------------
let path = null; // { curve, quats }
let playStart = null;

function applyPose(cam) {
  camera.position.fromArray(cam.position);
  camera.quaternion.fromArray(cam.quaternion);
}

function reset() {
  stopPlay();
  if (path) applyPose(path.cameras[0]);
}

fetch(CAMERAS_URL)
  .then((r) => r.json())
  .then((data) => {
    camera.fov = data.fovY;
    camera.updateProjectionMatrix();
    const cameras = data.cameras;
    path = {
      cameras,
      curve: new THREE.CatmullRomCurve3(cameras.map((c) => new THREE.Vector3(...c.position))),
      quats: cameras.map((c) => new THREE.Quaternion(...c.quaternion)),
    };
    // Scale keyboard speed to the scene: the video path length covers ~20s.
    controls.fpsMovement.moveSpeed = path.curve.getLength() / PATH_SECONDS;
    applyPose(cameras[0]);
  });

const playBtn = document.getElementById("play");
function startPlay() {
  if (!path) return;
  playStart = performance.now();
  playBtn.textContent = "■ Stop";
}
function stopPlay() {
  playStart = null;
  playBtn.textContent = "▶ Play path";
}
function togglePlay() {
  playStart === null ? startPlay() : stopPlay();
}

const tmpQ = new THREE.Quaternion();
function updatePlay(now) {
  const t = Math.min((now - playStart) / 1000 / PATH_SECONDS, 1);
  const s = smooth(t);
  camera.position.copy(path.curve.getPoint(s));
  const f = s * (path.quats.length - 1);
  const i = Math.min(Math.floor(f), path.quats.length - 2);
  tmpQ.copy(path.quats[i]).slerp(path.quats[i + 1], f - i);
  camera.quaternion.copy(tmpQ);
  if (t >= 1) stopPlay();
}
const smooth = (t) => t * t * (3 - 2 * t);

// Any direct interaction cancels playback.
canvas.addEventListener("pointerdown", stopPlay);
canvas.addEventListener("wheel", stopPlay, { passive: true });

// ---- UI ------------------------------------------------------------------
const help = document.getElementById("help");
playBtn.addEventListener("click", togglePlay);
document.getElementById("reset").addEventListener("click", reset);
document.getElementById("help-toggle").addEventListener("click", () => (help.hidden = !help.hidden));
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "p") togglePlay();
  else if (k === "r") reset();
  else if (k === "h" || k === "?") help.hidden = !help.hidden;
  else if ("wasdqe".includes(k) || e.key.startsWith("Arrow")) stopPlay();
});

// ---- Loop ----------------------------------------------------------------
renderer.setAnimationLoop((now) => {
  if (playStart !== null) updatePlay(now);
  else controls.update(camera);
  renderer.render(scene, camera);
});
