import { App } from "./core/app";
// Signal overlay deactivated — entering VR directly for now
// import { SignalOverlay } from "./signal/SignalOverlay";
import { Landing } from "./landing/Landing";

const canvas = document.getElementById("encontro-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #encontro-canvas not found");
}

let app: App | null = null;

/**
 * Landing page appears first — sets the atmosphere.
 * When the user clicks "begin", the Three.js world starts and
 * enters immersive WebXR directly — the user becomes a field of energy.
 */
const landing = new Landing(document.body);

landing.onEnter(() => {
  // Create AudioContext FIRST while user gesture is still active —
  // the App constructor does heavy work (shaders, geometry) that can
  // exhaust the gesture activation window on Quest.
  const audioCtx = new AudioContext();

  app = new App(canvas, audioCtx);
  app.start();
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  app?.dispose();
});
