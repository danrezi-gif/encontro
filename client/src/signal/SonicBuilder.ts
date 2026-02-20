import * as Tone from "tone";
import type { SonicProfile } from "@shared/SignalArtifact";

interface TonePrimitive {
  id: number;
  label: string;
  /** Frequency in Hz */
  frequency: number;
  /** Tone.js oscillator type */
  type: OscillatorType | "sawtooth";
  /** Visual description */
  description: string;
  /** Roughly BPM if rhythmic, 0 if drone */
  rhythmicPulse: number;
  /** 0=pure, 1=rough */
  roughness: number;
  /** Harmonic density contribution */
  harmonicWeight: number;
}

const TONE_PRIMITIVES: TonePrimitive[] = [
  {
    id: 0,
    label: "abyss",
    frequency: 55,
    type: "sine",
    description: "deep ground drone",
    rhythmicPulse: 0,
    roughness: 0.05,
    harmonicWeight: 0.7,
  },
  {
    id: 1,
    label: "pulse",
    frequency: 110,
    type: "sine",
    description: "slow heartbeat resonance",
    rhythmicPulse: 40,
    roughness: 0.1,
    harmonicWeight: 0.6,
  },
  {
    id: 2,
    label: "throat",
    frequency: 220,
    type: "triangle",
    description: "warm mid breath",
    rhythmicPulse: 0,
    roughness: 0.2,
    harmonicWeight: 0.5,
  },
  {
    id: 3,
    label: "crystal",
    frequency: 528,
    type: "sine",
    description: "high pure tone",
    rhythmicPulse: 0,
    roughness: 0.05,
    harmonicWeight: 0.4,
  },
  {
    id: 4,
    label: "hum",
    frequency: 396,
    type: "triangle",
    description: "bell-like overtone",
    rhythmicPulse: 0,
    roughness: 0.15,
    harmonicWeight: 0.6,
  },
  {
    id: 5,
    label: "static",
    frequency: 800,
    type: "sawtooth",
    description: "electric texture",
    rhythmicPulse: 0,
    roughness: 0.8,
    harmonicWeight: 0.9,
  },
  {
    id: 6,
    label: "wave",
    frequency: 174,
    type: "sine",
    description: "rolling swell",
    rhythmicPulse: 20,
    roughness: 0.1,
    harmonicWeight: 0.5,
  },
  {
    id: 7,
    label: "shrine",
    frequency: 963,
    type: "sine",
    description: "high delicate shimmer",
    rhythmicPulse: 0,
    roughness: 0.05,
    harmonicWeight: 0.3,
  },
];

/**
 * Sonic gesture builder — composes an ambient loop from tonal primitives.
 *
 * The user doesn't select presets. They activate, listen, adjust.
 * The combination of tones + their choices carry signal.
 */
export class SonicBuilder {
  private container: HTMLElement;
  private activeTones: Set<number> = new Set();
  private synths: Map<number, Tone.Synth | Tone.AMSynth> = new Map();
  private audioNodes: Map<number, { volume: Tone.Volume; reverb: Tone.Reverb }> = new Map();
  private isAudioStarted = false;
  private isDisposed = false;
  private colorHue = 220;
  private onChangeCallback?: (profile: SonicProfile) => void;

  constructor(parent: HTMLElement, colorHue = 220) {
    this.colorHue = colorHue;
    this.container = document.createElement("div");
    this.container.className = "flex flex-col items-center gap-4 w-full";
    this.render();
    parent.appendChild(this.container);
  }

  onChange(cb: (profile: SonicProfile) => void): void {
    this.onChangeCallback = cb;
  }

  setColorHue(hue: number): void {
    this.colorHue = hue;
    this.updateButtonColors();
  }

  private render(): void {
    this.container.innerHTML = `
      <p class="text-xs opacity-30 font-light text-center">
        tap tones to compose your sound signature
      </p>
      <div id="tone-grid" class="grid grid-cols-4 gap-2 w-full max-w-xs"></div>
      <div id="sonic-waveform" class="w-full max-w-xs h-10 relative overflow-hidden">
        <canvas id="sonic-wave-canvas" class="w-full h-full"></canvas>
      </div>
      <p id="sonic-status" class="text-xs opacity-20 font-light">silence</p>
    `;

    const grid = this.container.querySelector("#tone-grid")!;
    for (const tone of TONE_PRIMITIVES) {
      const btn = document.createElement("button");
      btn.dataset.toneId = String(tone.id);
      btn.className = `
        flex flex-col items-center justify-center
        p-2 rounded-lg border border-white/10 text-center
        transition-all duration-300 select-none
        hover:border-white/30 active:scale-95
      `;
      btn.style.minHeight = "56px";
      btn.innerHTML = `
        <span class="text-xs font-light opacity-70 leading-none">${tone.label}</span>
        <span class="text-[9px] opacity-30 mt-0.5 leading-none">${tone.description}</span>
      `;
      btn.addEventListener("click", () => this.toggleTone(tone.id));
      grid.appendChild(btn);
    }

    this.startWaveformAnimation();
  }

  private async ensureAudioStarted(): Promise<void> {
    if (this.isAudioStarted) return;
    await Tone.start();
    this.isAudioStarted = true;
  }

  private async toggleTone(id: number): Promise<void> {
    await this.ensureAudioStarted();

    if (this.activeTones.has(id)) {
      // Deactivate
      this.activeTones.delete(id);
      const synth = this.synths.get(id);
      const nodes = this.audioNodes.get(id);
      if (synth) {
        synth.triggerRelease();
        setTimeout(() => {
          synth.dispose();
          this.synths.delete(id);
          if (nodes) {
            nodes.reverb.dispose();
            nodes.volume.dispose();
            this.audioNodes.delete(id);
          }
        }, 500);
      }
    } else {
      // Activate
      this.activeTones.add(id);
      const primitive = TONE_PRIMITIVES[id];
      const synth = this.createSynth(primitive);
      this.synths.set(id, synth);
      synth.triggerAttack(primitive.frequency);
    }

    this.updateButtonState(id);
    this.updateStatus();
    this.emitChange();
  }

  private createSynth(primitive: TonePrimitive): Tone.Synth | Tone.AMSynth {
    const volume = new Tone.Volume(-18).toDestination();
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(volume);

    const synth = new Tone.Synth({
      oscillator: {
        type: primitive.type as OscillatorType,
      },
      envelope: {
        attack: 2,
        decay: 0.5,
        sustain: 0.8,
        release: 3,
      },
    }).connect(reverb);

    this.audioNodes.set(primitive.id, { volume, reverb });
    return synth;
  }

  private updateButtonState(id: number): void {
    const btn = this.container.querySelector(`[data-tone-id="${id}"]`) as HTMLElement;
    if (!btn) return;

    if (this.activeTones.has(id)) {
      const hsl = `hsl(${this.colorHue}, 60%, 50%)`;
      const hslGlow = `hsl(${this.colorHue}, 70%, 55%)`;
      btn.style.borderColor = hsl;
      btn.style.backgroundColor = `hsla(${this.colorHue}, 60%, 30%, 0.25)`;
      btn.style.boxShadow = `0 0 12px 2px hsla(${this.colorHue}, 70%, 45%, 0.3), inset 0 0 8px hsla(${this.colorHue}, 70%, 45%, 0.1)`;
      btn.querySelector("span")?.classList.remove("opacity-70");
      btn.querySelector("span")?.classList.add("opacity-100");
      (btn.querySelector("span") as HTMLElement).style.color = hslGlow;
    } else {
      btn.style.borderColor = "";
      btn.style.backgroundColor = "";
      btn.style.boxShadow = "";
      (btn.querySelector("span") as HTMLElement).style.color = "";
      btn.querySelector("span")?.classList.remove("opacity-100");
      btn.querySelector("span")?.classList.add("opacity-70");
    }
  }

  private updateButtonColors(): void {
    for (const id of this.activeTones) {
      this.updateButtonState(id);
    }
  }

  private updateStatus(): void {
    const status = this.container.querySelector("#sonic-status") as HTMLElement;
    if (!status) return;

    if (this.activeTones.size === 0) {
      status.textContent = "silence";
      status.style.opacity = "0.2";
    } else {
      const names = [...this.activeTones].map((id) => TONE_PRIMITIVES[id].label);
      status.textContent = names.join(" + ");
      status.style.opacity = "0.5";
    }
  }

  private startWaveformAnimation(): void {
    const canvas = this.container.querySelector("#sonic-wave-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const animate = () => {
      if (this.isDisposed || !canvas.isConnected) return;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (this.activeTones.size === 0) {
        // Flat line
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Composite waveform from active tones
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          let y = h / 2;
          for (const id of this.activeTones) {
            const p = TONE_PRIMITIVES[id];
            const phase = (frame * 0.02 * p.frequency) / 100;
            const amplitude = (h * 0.3) / this.activeTones.size;
            y += Math.sin((x / w) * Math.PI * 2 * (p.frequency / 110) + phase) * amplitude;
          }
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${this.colorHue}, 60%, 60%, 0.6)`;
        ctx.shadowColor = `hsl(${this.colorHue}, 70%, 55%)`;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private emitChange(): void {
    if (!this.onChangeCallback) return;
    this.onChangeCallback(this.encodeProfile());
  }

  encodeProfile(): SonicProfile {
    if (this.activeTones.size === 0) {
      return {
        frequencyCenter: 0,
        harmonicDensity: 0,
        rhythmicPulse: 0,
        textureRoughness: 0,
        activeTones: [],
      };
    }

    const active = [...this.activeTones].map((id) => TONE_PRIMITIVES[id]);

    const frequencyCenter =
      active.reduce((sum, p) => sum + p.frequency, 0) / active.length;

    const harmonicDensity = Math.min(
      1,
      active.reduce((sum, p) => sum + p.harmonicWeight, 0) / active.length
    );

    const rhythmicPulse =
      active.reduce((sum, p) => sum + p.rhythmicPulse, 0) / active.length;

    const textureRoughness = Math.min(
      1,
      active.reduce((sum, p) => sum + p.roughness, 0) / active.length
    );

    return {
      frequencyCenter,
      harmonicDensity,
      rhythmicPulse,
      textureRoughness,
      activeTones: [...this.activeTones],
    };
  }

  hasContent(): boolean {
    return this.activeTones.size > 0;
  }

  dispose(): void {
    this.isDisposed = true;
    for (const synth of this.synths.values()) {
      synth.triggerRelease();
      synth.dispose();
    }
    this.synths.clear();
    for (const nodes of this.audioNodes.values()) {
      nodes.reverb.dispose();
      nodes.volume.dispose();
    }
    this.audioNodes.clear();
    this.container.remove();
  }
}
