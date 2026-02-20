import { App } from "./core/app";
import { SignalOverlay } from "./signal/SignalOverlay";
import { Landing } from "./landing/Landing";

const canvas = document.getElementById("encontro-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #encontro-canvas not found");
}

let app: App | null = null;

/**
 * Landing page appears first — sets the atmosphere.
 * When the user clicks "begin", the Three.js world starts immediately
 * and signal creation happens as glass panels overlaying the live 3D scene.
 */
const landing = new Landing(document.body);

landing.onEnter(() => {
  // Start the 3D world immediately
  app = new App(canvas);
  app.setAutoOrbit(true);
  app.start();

  // Signal creation overlays the live 3D scene
  const overlay = new SignalOverlay(document.body);

  overlay.onComplete((artifact) => {
    if (app) {
      app.setArtifact(artifact);
      app.setAutoOrbit(false);
    }
  });
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  app?.dispose();
});
