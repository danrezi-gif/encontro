import { App } from "./core/app";

const canvas = document.getElementById("encontro-canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element #encontro-canvas not found");
}

const app = new App(canvas);
app.start();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  app.dispose();
});
