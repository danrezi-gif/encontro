import { ColorMixer } from "./ColorMixer";
import { MarkCanvas } from "./MarkCanvas";
import { SonicBuilder } from "./SonicBuilder";
import { IntentionSelector } from "./IntentionSelector";
import {
  type SignalArtifact,
  type ColorProfile,
  type SonicProfile,
  type MarkProfile,
  generateSessionKey,
} from "@shared/SignalArtifact";

type Step = "color" | "mark" | "sonic" | "intention" | "complete";

const STEP_ORDER: Step[] = ["color", "mark", "sonic", "intention", "complete"];

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  color: {
    title: "your color",
    subtitle: "build a palette — not by choosing, but by mixing",
  },
  mark: {
    title: "your mark",
    subtitle: "one gesture — let it come without thinking",
  },
  sonic: {
    title: "your sound",
    subtitle: "compose the tones that feel like your current state",
  },
  intention: {
    title: "your intention",
    subtitle: "choose what resonates — not what you think, what you feel",
  },
  complete: {
    title: "your signal",
    subtitle: "cast into the field",
  },
};

/**
 * SignalCanvas — the Phase 0 Signal Layer entry experience.
 *
 * A 4-step expressive tool that creates a SignalArtifact.
 * The artifact encodes the user's current field state — not their identity.
 *
 * Color → Mark → Sonic → Intention → Cast
 */
export class SignalCanvas {
  private container: HTMLElement;
  private currentStep: Step = "color";

  private colorMixer?: ColorMixer;
  private markCanvas?: MarkCanvas;
  private sonicBuilder?: SonicBuilder;
  private intentionSelector?: IntentionSelector;

  private colorProfile: ColorProfile = {
    dominantHues: [],
    saturationMean: 0.7,
    brightnessProfile: [0.2, 0.5, 0.3],
    warmthCoolBalance: 0,
  };
  private markProfile: MarkProfile = {
    strokeVelocityMean: 0,
    directionality: 0,
    closureIndex: 0,
    densityMap: new Array(9).fill(0),
    coverage: 0,
  };
  private sonicProfile: SonicProfile = {
    frequencyCenter: 0,
    harmonicDensity: 0,
    rhythmicPulse: 0,
    textureRoughness: 0,
    activeTones: [],
  };
  private intentionVector: number[] = [];
  private dominantHue = 220;

  private onCompleteCallback?: (artifact: SignalArtifact) => void;

  constructor(private parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.id = "signal-canvas";
    this.container.className = `
      fixed inset-0 z-50 flex flex-col
      bg-black/95
    `;
    this.container.style.fontFamily = "'Inter', sans-serif";

    parent.appendChild(this.container);
    this.render();
  }

  onComplete(cb: (artifact: SignalArtifact) => void): void {
    this.onCompleteCallback = cb;
  }

  private render(): void {
    this.container.innerHTML = "";
    this.disposeTools();

    const step = this.currentStep;
    const meta = STEP_META[step];
    const stepIndex = STEP_ORDER.indexOf(step);

    // Progress dots (not on complete screen)
    const progressHTML =
      step !== "complete"
        ? `<div class="flex gap-2 items-center">
          ${STEP_ORDER.filter((s) => s !== "complete").map((s, i) => `
            <div class="rounded-full transition-all duration-500 ${
              s === step
                ? `w-4 h-1.5 bg-white/60`
                : i < stepIndex
                  ? `w-1.5 h-1.5 bg-white/30`
                  : `w-1.5 h-1.5 bg-white/10`
            }"></div>
          `).join("")}
        </div>`
        : "";

    // Header
    const header = document.createElement("div");
    header.className = "flex flex-col items-center pt-10 pb-4 px-6 gap-2";
    header.innerHTML = `
      ${progressHTML}
      <h2 class="text-lg font-light tracking-wider text-white/80 mt-2">${meta.title}</h2>
      <p class="text-xs text-white/30 font-light text-center max-w-xs leading-relaxed">
        ${meta.subtitle}
      </p>
    `;

    // Tool area
    const toolArea = document.createElement("div");
    toolArea.className =
      "flex-1 flex flex-col items-center justify-center px-6 overflow-auto";
    toolArea.id = "tool-area";

    // Navigation
    const navArea = document.createElement("div");
    navArea.className = "flex items-center justify-between px-6 pb-8 pt-4 gap-4";

    const backBtn = document.createElement("button");
    backBtn.className = `
      text-xs font-light opacity-30 hover:opacity-60
      transition-opacity duration-300 px-3 py-1
    `;
    backBtn.textContent = stepIndex > 0 && step !== "complete" ? "← back" : "";
    backBtn.addEventListener("click", () => {
      if (stepIndex > 0) this.goToStep(STEP_ORDER[stepIndex - 1]);
    });

    const nextBtn = document.createElement("button");
    nextBtn.id = "signal-next-btn";
    nextBtn.className = `
      text-sm font-light px-8 py-3
      border border-white/20 rounded-full
      hover:bg-white/5 hover:border-white/40
      transition-all duration-300 opacity-60 hover:opacity-100
    `;

    if (step === "intention") {
      nextBtn.textContent = "cast signal →";
    } else if (step === "complete") {
      nextBtn.textContent = "enter the dark →";
      nextBtn.style.opacity = "1";
      nextBtn.style.borderColor = `hsl(${this.dominantHue}, 40%, 40%)`;
      nextBtn.style.boxShadow = `0 0 20px 4px hsla(${this.dominantHue}, 60%, 30%, 0.2)`;
    } else {
      nextBtn.textContent = "continue →";
    }

    nextBtn.addEventListener("click", () => this.handleNext());

    const skipBtn = document.createElement("button");
    skipBtn.className = "text-[10px] font-light opacity-20 hover:opacity-40 transition-opacity px-2";
    skipBtn.textContent = step !== "complete" ? "skip" : "";
    skipBtn.addEventListener("click", () => this.handleNext(true));

    const rightStack = document.createElement("div");
    rightStack.className = "flex flex-col items-end gap-1";
    rightStack.appendChild(nextBtn);
    rightStack.appendChild(skipBtn);

    navArea.appendChild(backBtn);
    navArea.appendChild(rightStack);

    this.container.appendChild(header);
    this.container.appendChild(toolArea);
    this.container.appendChild(navArea);

    // Mount the tool for this step
    this.mountTool(step, toolArea);
  }

  private mountTool(step: Step, area: HTMLElement): void {
    switch (step) {
      case "color":
        this.colorMixer = new ColorMixer(area);
        this.colorMixer.onChange((profile) => {
          this.colorProfile = profile;
          if (profile.dominantHues.length > 0) {
            this.dominantHue = profile.dominantHues[0];
          }
          this.applyColorAccent();
        });
        break;

      case "mark":
        this.markCanvas = new MarkCanvas(area, this.dominantHue);
        this.markCanvas.onChange((profile) => {
          this.markProfile = profile;
        });
        break;

      case "sonic":
        this.sonicBuilder = new SonicBuilder(area, this.dominantHue);
        this.sonicBuilder.onChange((profile) => {
          this.sonicProfile = profile;
        });
        break;

      case "intention":
        this.intentionSelector = new IntentionSelector(area, this.dominantHue);
        this.intentionSelector.onChange((vector) => {
          this.intentionVector = vector;
        });
        break;

      case "complete":
        this.renderCompleteScreen(area);
        break;
    }
  }

  private renderCompleteScreen(area: HTMLElement): void {
    const hue = this.dominantHue;

    // Visual: animated glowing orb representing the artifact
    const orb = document.createElement("div");
    orb.className = "relative flex items-center justify-center";
    orb.style.cssText = `width: 180px; height: 180px;`;

    orb.innerHTML = `
      <canvas id="artifact-orb" width="180" height="180"></canvas>
    `;

    const summary = document.createElement("div");
    summary.className = "mt-8 text-center space-y-1 max-w-xs";
    summary.innerHTML = `
      <p class="text-xs font-light opacity-40">your signal artifact is ready</p>
      <p class="text-xs font-light opacity-20 max-w-[220px] mx-auto leading-relaxed mt-2">
        cast into the field — the agent will search for resonance
      </p>
    `;

    // Color preview dots
    const dots = document.createElement("div");
    dots.className = "flex gap-2 justify-center mt-4";
    for (const h of this.colorProfile.dominantHues.slice(0, 5)) {
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        background: hsl(${h}, ${this.colorProfile.saturationMean * 100}%, 60%);
        box-shadow: 0 0 6px 2px hsl(${h}, 80%, 50%);
      `;
      dots.appendChild(dot);
    }

    area.className += " gap-4";
    area.appendChild(orb);
    area.appendChild(dots);
    area.appendChild(summary);

    // Animate the orb canvas
    this.animateArtifactOrb(hue);
  }

  private animateArtifactOrb(hue: number): void {
    const canvas = this.container.querySelector("#artifact-orb") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const tones = this.sonicProfile.activeTones;
    const size = 180;
    const cx = size / 2;
    const cy = size / 2;

    const animate = () => {
      if (!canvas.isConnected) return;

      ctx.clearRect(0, 0, size, size);
      const t = frame * 0.02;

      // Breathing scale
      const breathe = 1 + 0.05 * Math.sin(t * 0.8);

      // Draw layered glow rings from dominant hues
      const hues = this.colorProfile.dominantHues.length > 0
        ? this.colorProfile.dominantHues
        : [hue];

      for (let i = hues.length - 1; i >= 0; i--) {
        const h = hues[i];
        const r = (60 - i * 8) * breathe;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, `hsla(${h}, 80%, 70%, ${0.6 - i * 0.1})`);
        grd.addColorStop(0.5, `hsla(${h}, 70%, 50%, ${0.3 - i * 0.05})`);
        grd.addColorStop(1, `hsla(${h}, 60%, 40%, 0)`);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Sonic ripples from active tones
      if (tones.length > 0) {
        for (let i = 0; i < tones.length; i++) {
          const ripplePhase = t * (1 + i * 0.3) + (i * Math.PI * 2) / tones.length;
          const rippleR = 70 * breathe + 15 * Math.sin(ripplePhase);
          ctx.beginPath();
          ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue + i * 20}, 60%, 60%, ${0.08 - i * 0.01})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Outer aura
      const aura = ctx.createRadialGradient(cx, cy, 60 * breathe, cx, cy, 90);
      aura.addColorStop(0, `hsla(${hue}, 60%, 50%, 0.1)`);
      aura.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      frame++;
      requestAnimationFrame(animate);
    };

    animate();
  }

  private applyColorAccent(): void {
    // Subtle warm accent on next button
    const nextBtn = this.container.querySelector("#signal-next-btn") as HTMLElement;
    if (nextBtn && this.dominantHue > 0) {
      nextBtn.style.borderColor = `hsl(${this.dominantHue}, 30%, 35%)`;
    }
  }

  private handleNext(_skip = false): void {
    const stepIndex = STEP_ORDER.indexOf(this.currentStep);

    if (this.currentStep === "complete") {
      // Emit the complete artifact
      this.emitComplete();
      return;
    }

    // Encode current step before advancing (even if skipped)
    this.encodeCurrentStep();

    if (stepIndex < STEP_ORDER.length - 1) {
      this.goToStep(STEP_ORDER[stepIndex + 1]);
    }
  }

  private encodeCurrentStep(): void {
    switch (this.currentStep) {
      case "color":
        if (this.colorMixer) {
          this.colorProfile = this.colorMixer.encodeProfile();
          if (this.colorProfile.dominantHues.length > 0) {
            this.dominantHue = this.colorProfile.dominantHues[0];
          }
        }
        break;
      case "mark":
        if (this.markCanvas) this.markProfile = this.markCanvas.encodeProfile();
        break;
      case "sonic":
        if (this.sonicBuilder) this.sonicProfile = this.sonicBuilder.encodeProfile();
        break;
      case "intention":
        if (this.intentionSelector) this.intentionVector = this.intentionSelector.encodeVector();
        break;
    }
  }

  private goToStep(step: Step): void {
    this.currentStep = step;
    this.render();
  }

  private disposeTools(): void {
    this.colorMixer?.dispose();
    this.colorMixer = undefined;
    this.markCanvas?.dispose();
    this.markCanvas = undefined;
    this.sonicBuilder?.dispose();
    this.sonicBuilder = undefined;
    this.intentionSelector?.dispose();
    this.intentionSelector = undefined;
  }

  private emitComplete(): void {
    const artifact: SignalArtifact = {
      sessionKey: generateSessionKey(),
      timestamp: Date.now(),
      colorProfile: this.colorProfile,
      sonicProfile: this.sonicProfile,
      markProfile: this.markProfile,
      intentionVector: this.intentionVector,
    };

    console.log("[Signal] Artifact encoded:", artifact);

    this.onCompleteCallback?.(artifact);
    this.dismiss();
  }

  private dismiss(): void {
    // Fade out
    this.container.style.transition = "opacity 1.2s ease";
    this.container.style.opacity = "0";
    setTimeout(() => {
      this.container.remove();
    }, 1300);
  }

  dispose(): void {
    this.disposeTools();
    this.container.remove();
  }
}
