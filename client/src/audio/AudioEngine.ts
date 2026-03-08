/**
 * Audio — just plays the mp3 on loop. That's it.
 */
export class AudioEngine {
  private el: HTMLAudioElement | null = null;

  play(): void {
    this.el = new Audio("/sounds/khachaturian-adagio.mp3");
    this.el.loop = true;
    this.el.volume = 0.35;
    this.el.play().catch((err) => console.warn("[Audio] play failed:", err));
  }

  update(_delta: number): void {}

  dispose(): void {
    if (this.el) {
      this.el.pause();
      this.el.src = "";
      this.el = null;
    }
  }
}
