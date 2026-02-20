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

type Step = "color" | "mark" | "sonic" | "intention";

const STEPS: Step[] = ["color", "mark", "sonic", "intention"];

const STEP_LABELS: Record<Step, { title: string; hint: string }> = {
  color: { title: "color", hint: "tap the wheel" },
  mark: { title: "mark", hint: "draw a gesture" },
  sonic: { title: "sound", hint: "choose your tones" },
  intention: { title: "intention", hint: "feel, don't think" },
};

/**
 * SignalOverlay — signal creation as glass panels floating over the live 3D scene.
 *
 * The 3D world is visible and alive behind the semi-transparent panels.
 * Each tool appears in a compact glass card. Navigation is via
 * directional swipe or nav dots.
 */
export class SignalOverlay {
  private container: HTMLElement;
  private panel: HTMLElement;
  private toolMount: HTMLElement;
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

  constructor(parent: HTMLElement) {
    // Full-screen transparent overlay container
    this.container = document.createElement("div");
    this.container.id = "signal-overlay";
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      font-family: 'Inter', sans-serif;
    `;

    // Glass panel
    this.panel = document.createElement("div");
    this.panel.style.cssText = `
      pointer-events: auto;
      width: 380px; max-width: 90vw;
      max-height: 85vh;
      display: flex; flex-direction: column;
      align-items: center;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 28px 24px 20px;
      box-shadow: 0 8px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      overflow: hidden;
      opacity: 0;
      transform: scale(0.95) translateY(20px);
      transition: opacity 0.8s ease, transform 0.8s ease;
    `;

    // Tool mount area
    this.toolMount = document.createElement("div");
    this.toolMount.style.cssText = `
      width: 100%;
      display: flex; flex-direction: column;
      align-items: center;
      min-height: 280px;
      max-height: 55vh;
      overflow-y: auto;
      overflow-x: hidden;
    `;

    this.container.appendChild(this.panel);
    parent.appendChild(this.container);

    this.buildPanel();

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.panel.style.opacity = "1";
        this.panel.style.transform = "scale(1) translateY(0)";
      });
    });
  }

  onComplete(cb: (artifact: SignalArtifact) => void): void {
    this.onCompleteCallback = cb;
  }

  private buildPanel(): void {
    this.panel.innerHTML = "";
    this.disposeTools();

    const step = this.currentStep;
    const meta = STEP_LABELS[step];
    const stepIndex = STEPS.indexOf(step);

    // Header: step title + hint
    const header = document.createElement("div");
    header.style.cssText = `
      text-align: center; margin-bottom: 16px; width: 100%;
    `;
    header.innerHTML = `
      <h2 style="
        font-size: 1.1rem; font-weight: 300;
        letter-spacing: 0.2em; color: rgba(255,255,255,0.75);
        margin: 0 0 6px 0;
      ">${meta.title}</h2>
      <p style="
        font-size: 0.65rem; font-weight: 300;
        color: rgba(255,255,255,0.25);
        letter-spacing: 0.1em;
      ">${meta.hint}</p>
    `;

    // Nav dots
    const dots = document.createElement("div");
    dots.style.cssText = `
      display: flex; gap: 8px; justify-content: center;
      margin-bottom: 20px;
    `;
    for (let i = 0; i < STEPS.length; i++) {
      const dot = document.createElement("button");
      dot.style.cssText = `
        width: ${i === stepIndex ? "20px" : "6px"};
        height: 6px;
        border-radius: 3px;
        border: none;
        cursor: pointer;
        transition: all 0.4s ease;
        background: ${
          i === stepIndex
            ? `rgba(255,255,255,0.5)`
            : i < stepIndex
              ? `rgba(255,255,255,0.25)`
              : `rgba(255,255,255,0.1)`
        };
      `;
      const targetStep = STEPS[i];
      dot.addEventListener("click", () => {
        this.encodeCurrentStep();
        this.goToStep(targetStep);
      });
      dots.appendChild(dot);
    }

    // Reset tool mount
    this.toolMount.innerHTML = "";

    // Bottom nav
    const nav = document.createElement("div");
    nav.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; margin-top: 16px; gap: 12px;
    `;

    // Back button
    const backBtn = document.createElement("button");
    backBtn.style.cssText = `
      font-size: 0.7rem; font-weight: 300;
      color: rgba(255,255,255,0.3);
      background: none; border: none; cursor: pointer;
      padding: 8px 12px;
      transition: color 0.3s;
      visibility: ${stepIndex > 0 ? "visible" : "hidden"};
    `;
    backBtn.textContent = "back";
    backBtn.addEventListener("mouseenter", () => { backBtn.style.color = "rgba(255,255,255,0.6)"; });
    backBtn.addEventListener("mouseleave", () => { backBtn.style.color = "rgba(255,255,255,0.3)"; });
    backBtn.addEventListener("click", () => {
      if (stepIndex > 0) {
        this.encodeCurrentStep();
        this.goToStep(STEPS[stepIndex - 1]);
      }
    });

    // Next / cast button
    const nextBtn = document.createElement("button");
    const isLast = stepIndex === STEPS.length - 1;
    nextBtn.textContent = isLast ? "cast signal" : "next";
    nextBtn.style.cssText = `
      font-size: 0.75rem; font-weight: 300;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,${isLast ? "0.9" : "0.6"});
      background: ${isLast ? `rgba(255,255,255,0.08)` : "none"};
      border: 1px solid rgba(255,255,255,${isLast ? "0.2" : "0.12"});
      border-radius: 999px;
      padding: 10px 28px;
      cursor: pointer;
      transition: all 0.4s ease;
    `;
    if (isLast) {
      nextBtn.style.borderColor = `hsl(${this.dominantHue}, 40%, 40%)`;
      nextBtn.style.boxShadow = `0 0 20px 4px hsla(${this.dominantHue}, 60%, 30%, 0.3)`;
    }
    nextBtn.addEventListener("mouseenter", () => {
      nextBtn.style.borderColor = isLast
        ? `hsl(${this.dominantHue}, 50%, 50%)`
        : "rgba(255,255,255,0.3)";
      nextBtn.style.color = "rgba(255,255,255,0.9)";
    });
    nextBtn.addEventListener("mouseleave", () => {
      nextBtn.style.borderColor = isLast
        ? `hsl(${this.dominantHue}, 40%, 40%)`
        : "rgba(255,255,255,0.12)";
      nextBtn.style.color = `rgba(255,255,255,${isLast ? "0.9" : "0.6"})`;
    });
    nextBtn.addEventListener("click", () => this.handleNext());

    nav.appendChild(backBtn);
    nav.appendChild(nextBtn);

    this.panel.appendChild(header);
    this.panel.appendChild(dots);
    this.panel.appendChild(this.toolMount);
    this.panel.appendChild(nav);

    // Mount tool
    this.mountTool(step);
  }

  private mountTool(step: Step): void {
    switch (step) {
      case "color":
        this.colorMixer = new ColorMixer(this.toolMount);
        this.colorMixer.onChange((profile) => {
          this.colorProfile = profile;
          if (profile.dominantHues.length > 0) {
            this.dominantHue = profile.dominantHues[0];
          }
        });
        break;
      case "mark":
        this.markCanvas = new MarkCanvas(this.toolMount, this.dominantHue);
        this.markCanvas.onChange((profile) => {
          this.markProfile = profile;
        });
        break;
      case "sonic":
        this.sonicBuilder = new SonicBuilder(this.toolMount, this.dominantHue);
        this.sonicBuilder.onChange((profile) => {
          this.sonicProfile = profile;
        });
        break;
      case "intention":
        this.intentionSelector = new IntentionSelector(this.toolMount, this.dominantHue);
        this.intentionSelector.onChange((vector) => {
          this.intentionVector = vector;
        });
        break;
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
    // Animate panel transition
    this.panel.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    this.panel.style.opacity = "0";
    this.panel.style.transform = "scale(0.97)";

    setTimeout(() => {
      this.currentStep = step;
      this.buildPanel();

      this.panel.style.opacity = "0";
      this.panel.style.transform = "scale(0.97)";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.panel.style.transition = "opacity 0.5s ease, transform 0.5s ease";
          this.panel.style.opacity = "1";
          this.panel.style.transform = "scale(1)";
        });
      });
    }, 300);
  }

  private handleNext(): void {
    this.encodeCurrentStep();
    const stepIndex = STEPS.indexOf(this.currentStep);

    if (stepIndex < STEPS.length - 1) {
      this.goToStep(STEPS[stepIndex + 1]);
    } else {
      this.castSignal();
    }
  }

  private castSignal(): void {
    const artifact: SignalArtifact = {
      sessionKey: generateSessionKey(),
      timestamp: Date.now(),
      colorProfile: this.colorProfile,
      sonicProfile: this.sonicProfile,
      markProfile: this.markProfile,
      intentionVector: this.intentionVector,
    };

    console.log("[Signal] Artifact encoded:", artifact);

    // Dissolve panel
    this.panel.style.transition = "opacity 1.2s ease, transform 1.2s ease";
    this.panel.style.opacity = "0";
    this.panel.style.transform = "scale(1.05) translateY(-30px)";

    setTimeout(() => {
      this.onCompleteCallback?.(artifact);
      this.dispose();
    }, 1300);
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

  dispose(): void {
    this.disposeTools();
    this.container.remove();
  }
}
