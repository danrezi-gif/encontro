import { App } from "./core/app";
import { SignalCanvas } from "./signal/SignalCanvas";
import { Landing } from "./landing/Landing";
import type { SignalArtifact } from "@shared/SignalArtifact";

const canvas = document.getElementById("encontro-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #encontro-canvas not found");
}

let app: App | null = null;

/**
 * Landing page appears first — sets the atmosphere.
 * When the user chooses to enter, the Signal Canvas begins.
 * On artifact completion, the WebXR encounter app starts.
 */
const landing = new Landing(document.body);

landing.onEnter(() => {
  const signal = new SignalCanvas(document.body);

  signal.onComplete((artifact: SignalArtifact) => {
    // Start the Three.js / WebXR encounter app
    app = new App(canvas, artifact);
    app.start();
  });
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  app?.dispose();
});
