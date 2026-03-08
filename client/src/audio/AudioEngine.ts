/**
 * Audio system — Web Audio API.
 * Handles the background soundtrack and future generative audio layers.
 *
 * Accepts an optional pre-created AudioContext so the caller can create it
 * synchronously inside a user gesture before doing heavy init work.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private initialized = false;
  private playing = false;

  constructor(existingCtx?: AudioContext) {
    if (existingCtx) {
      this.ctx = existingCtx;
    }
  }

  /** Load the soundtrack. If no AudioContext was provided, creates one. */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(this.ctx.destination);

    // Resume — may already be running if created in gesture context
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    // Pre-load the soundtrack
    try {
      const response = await fetch("/sounds/khachaturian-adagio.mp3");
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.warn("[Audio] Failed to load soundtrack:", err);
    }

    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  /** Start the looping soundtrack with a gentle fade-in */
  async playSoundtrack(): Promise<void> {
    if (!this.ctx || !this.gainNode || !this.audioBuffer || this.playing) return;

    // Resume context if suspended (autoplay policy)
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.connect(this.gainNode);
    this.sourceNode.start(0);

    // Fade in over 3 seconds
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 3);

    this.playing = true;
  }

  /** Stop the soundtrack with a fade-out */
  stopSoundtrack(): void {
    if (!this.ctx || !this.gainNode || !this.sourceNode || !this.playing) return;

    const now = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + 2);

    const source = this.sourceNode;
    setTimeout(() => {
      try { source.stop(); } catch { /* already stopped */ }
    }, 2100);

    this.sourceNode = null;
    this.playing = false;
  }

  update(_delta: number): void {}

  dispose(): void {
    this.stopSoundtrack();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
