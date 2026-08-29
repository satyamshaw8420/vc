/**
 * Focus Monitor — on-device proctoring hook (browser-only).
 *
 * Privacy contract: video frames are analyzed in-memory by MediaPipe and are
 * NEVER stored, drawn to a canvas we keep, or uploaded anywhere. Only scalar
 * signals (presence %, gaze stability, head movement) leave this module.
 *
 * The signal heuristics below are deliberately simple — this interface is the
 * seam where a trained attention model will plug in later:
 *   createFaceMonitor(videoEl, onUpdate, onStatus) → { start, stop }
 */

export interface FocusSignals {
  presence: number; // 0..100 — share of recent frames with a face
  gazeStability: number; // 0..100 — inverse variance of eye/nose geometry
  headMovement: number; // 0..100 — normalized nose-tip displacement rate
  fps: number;
}

export type MonitorStatus = "loading" | "running" | "error";

export interface FaceMonitor {
  start: () => Promise<void>;
  stop: () => void;
}

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function createFaceMonitor(
  video: HTMLVideoElement,
  onUpdate: (s: FocusSignals) => void,
  onStatus: (status: MonitorStatus, message?: string) => void,
): FaceMonitor {
  let stopped = false;
  let intervalId: number | null = null;

  const stop = () => {
    stopped = true;
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
  };

  const start = async () => {
    onStatus("loading");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      });
      if (stopped) return;

      const WINDOW = 40;
      const presenceWindow: boolean[] = [];
      const gazeWindow: number[] = [];
      let lastNose: { x: number; y: number } | null = null;
      let movementEma = 0;
      let frames = 0;
      let lastFpsAt = performance.now();
      let fps = 0;

      intervalId = window.setInterval(() => {
        if (stopped || video.readyState < 2 || video.videoWidth === 0) return;
        let result;
        try {
          result = landmarker.detectForVideo(video, performance.now());
        } catch {
          return; // frame skipped — model busy
        }
        frames++;
        const now = performance.now();
        if (now - lastFpsAt >= 1000) {
          fps = Math.round((frames * 1000) / (now - lastFpsAt));
          frames = 0;
          lastFpsAt = now;
        }

        const lm = result.faceLandmarks?.[0];
        presenceWindow.push(Boolean(lm));
        if (presenceWindow.length > WINDOW) presenceWindow.shift();

        if (lm) {
          const nose = lm[1];
          const leftEye = lm[33];
          const rightEye = lm[263];
          const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1e-6;

          // Gaze proxy: eye-midpoint vs nose, normalized by inter-eye distance
          const midX = (leftEye.x + rightEye.x) / 2;
          const midY = (leftEye.y + rightEye.y) / 2;
          const gx = (midX - nose.x) / eyeDist;
          const gy = (midY - nose.y) / eyeDist;
          gazeWindow.push(gx * 4 + gy);
          if (gazeWindow.length > 30) gazeWindow.shift();

          // Head movement: normalized nose-tip displacement between frames
          if (lastNose) {
            const d = Math.hypot(nose.x - lastNose.x, nose.y - lastNose.y);
            movementEma = movementEma * 0.82 + d * 0.18;
          }
          lastNose = { x: nose.x, y: nose.y };
        }

        const presence =
          (presenceWindow.filter(Boolean).length / Math.max(1, presenceWindow.length)) * 100;

        let gazeVar = 0;
        if (gazeWindow.length > 4) {
          const mean = gazeWindow.reduce((a, b) => a + b, 0) / gazeWindow.length;
          gazeVar =
            gazeWindow.reduce((a, b) => a + (b - mean) * (b - mean), 0) / gazeWindow.length;
        }
        const gazeStability = gazeWindow.length > 4 ? clamp(100 - gazeVar * 14000, 4, 100) : 0;
        const headMovement = clamp(movementEma * 2600, 0, 100);

        onUpdate({
          presence: Math.round(presence),
          gazeStability: Math.round(gazeStability),
          headMovement: Math.round(headMovement),
          fps,
        });
      }, 120);

      onStatus("running");
    } catch (e) {
      if (!stopped) {
        onStatus(
          "error",
          `Focus model could not load (${(e as Error).message || "network"}). It is fetched from a CDN at runtime.`,
        );
      }
    }
  };

  return { start, stop };
}
