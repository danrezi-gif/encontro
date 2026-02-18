import { App } from "./core/app";
import { SignalCanvas } from "./signal/SignalCanvas";
import type { SignalArtifact } from "@shared/SignalArtifact";

const canvas = document.getElementById("encontro-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #encontro-canvas not found");
}

let app: App | null = null;

/**
 * Signal Canvas appears first.
 * When the user completes their signal artifact, the WebXR encounter
 * app starts with the artifact seeding the presence aesthetics.
 */
const signal = new SignalCanvas(document.body);

signal.onComplete((artifact: SignalArtifact) => {
  // Store artifact for use in the encounter layer
  (window as unknown as Record<string, unknown>).__encontroArtifact = artifact;

  // Start the Three.js / WebXR encounter app
  app = new App(canvas, artifact);
  app.start();
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  app?.dispose();
});
