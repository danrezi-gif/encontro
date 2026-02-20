import type { ColorProfile } from "@shared/SignalArtifact";

interface PickedColor {
  h: number;  // 0-360
  s: number;  // 0-1
  l: number;  // 0-1
  weight: number; // relative weight based on pick order
}

/**
 * Color mixing tool — the user builds a palette by touching a hue/saturation
 * disc. Not choosing from presets — actually mixing.
 *
 * The rhythm of picking, the final palette, the warmth/cool balance:
 * these all carry signal.
 */
export class ColorMixer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private pickedColors: PickedColor[] = [];
  private maxColors = 5;
  private radius = 0;
  private cx = 0;
  private cy = 0;
  private isDragging = false;

  private onChangeCallback?: (profile: ColorProfile) => void;
  private boundResize = () => this.resize();

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "relative flex flex-col items-center gap-4";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "cursor-crosshair touch-none";
    this.canvas.style.borderRadius = "50%";

    const swatchRow = document.createElement("div");
    swatchRow.id = "color-swatches";
    swatchRow.className = "flex gap-2 h-5 items-center";
    swatchRow.innerHTML = `<span class="text-xs opacity-30 font-light">tap the wheel to pick colors</span>`;

    this.container.appendChild(this.canvas);
    this.container.appendChild(swatchRow);
    parent.appendChild(this.container);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;

    this.setupEventListeners();
    this.resize();
    window.addEventListener("resize", this.boundResize);
  }

  onChange(cb: (profile: ColorProfile) => void): void {
    this.onChangeCallback = cb;
  }

  private resize(): void {
    // Fit within parent, max 280px
    const size = Math.min(this.container.offsetWidth, 280);
    this.canvas.width = size;
    this.canvas.height = size;
    this.radius = size / 2 - 4;
    this.cx = size / 2;
    this.cy = size / 2;
    this.draw();
  }

  private setupEventListeners(): void {
    const pick = (x: number, y: number, isEnd = false) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = x - rect.left;
      const py = y - rect.top;
      const dx = px - this.cx;
      const dy = py - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.radius) return;

      const angle = Math.atan2(dy, dx);
      const h = ((angle * 180) / Math.PI + 360) % 360;
      const s = Math.min(dist / this.radius, 1);
      const l = isEnd ? 0.6 : 0.45 + (0.3 * (this.radius - dist)) / this.radius;

      if (isEnd && this.pickedColors.length < this.maxColors) {
        this.pickedColors.push({ h, s: Math.max(s, 0.3), l, weight: 1 });
        this.updateWeights();
        this.updateSwatches();
        this.emitChange();
      }

      this.draw(h, s, l, px, py);
    };

    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      pick(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDragging) pick(e.clientX, e.clientY);
      else {
        // Preview hover
        const rect = this.canvas.getBoundingClientRect();
        const dx = e.clientX - rect.left - this.cx;
        const dy = e.clientY - rect.top - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.radius) {
          const angle = Math.atan2(dy, dx);
          const h = ((angle * 180) / Math.PI + 360) % 360;
          const s = Math.min(dist / this.radius, 1);
          this.draw(h, s, 0.6, e.clientX - rect.left, e.clientY - rect.top);
        } else {
          this.draw();
        }
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (this.isDragging) pick(e.clientX, e.clientY, true);
      this.isDragging = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
      this.draw();
    });

    // Touch
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      pick(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      pick(t.clientX, t.clientY, true);
    }, { passive: false });
  }

  private updateWeights(): void {
    const n = this.pickedColors.length;
    // More recent picks have more weight — exponential decay
    this.pickedColors.forEach((c, i) => {
      c.weight = Math.pow(0.8, n - 1 - i);
    });
  }

  private updateSwatches(): void {
    const swatchRow = this.container.querySelector("#color-swatches") as HTMLElement;
    if (!swatchRow) return;
    swatchRow.innerHTML = this.pickedColors.map((c) => {
      const cssHsl = `hsl(${c.h.toFixed(0)}, ${(c.s * 100).toFixed(0)}%, ${(c.l * 100).toFixed(0)}%)`;
      return `<div style="width:16px;height:16px;border-radius:50%;
                   background:${cssHsl};
                   box-shadow:0 0 6px 2px ${cssHsl};
                   transition:all 0.3s;"></div>`;
    }).join("") + (this.pickedColors.length < this.maxColors
      ? `<span class="text-xs opacity-20 font-light ml-1">${this.maxColors - this.pickedColors.length} more</span>`
      : ``);
  }

  private draw(cursorH?: number, cursorS?: number, cursorL?: number, cursorX?: number, cursorY?: number): void {
    const { ctx, cx, cy, radius } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw hue/saturation disc using conic + radial gradients
    // First: conic gradient for hue
    const conic = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    for (let i = 0; i <= 360; i += 30) {
      conic.addColorStop(i / 360, `hsl(${i}, 80%, 55%)`);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = conic;
    ctx.fill();

    // Radial overlay: white center (desaturation)
    const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    radial.addColorStop(0, "rgba(0,0,0,0.85)");
    radial.addColorStop(0.25, "rgba(0,0,0,0.4)");
    radial.addColorStop(0.7, "rgba(0,0,0,0.05)");
    radial.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = radial;
    ctx.fill();

    // Thin ring border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw picked color dots
    this.pickedColors.forEach((c) => {
      const angle = (c.h * Math.PI) / 180;
      const r = c.s * radius;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const cssHsl = `hsl(${c.h}, ${c.s * 100}%, ${c.l * 100}%)`;

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = cssHsl;
      ctx.shadowColor = cssHsl;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Cursor preview
    if (cursorH !== undefined && cursorX !== undefined && cursorY !== undefined) {
      const previewHsl = `hsl(${cursorH.toFixed(0)}, ${((cursorS ?? 0.8) * 100).toFixed(0)}%, ${((cursorL ?? 0.6) * 100).toFixed(0)}%)`;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
      ctx.strokeStyle = previewHsl;
      ctx.shadowColor = previewHsl;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private emitChange(): void {
    if (!this.onChangeCallback) return;
    const profile = this.encodeProfile();
    this.onChangeCallback(profile);
  }

  encodeProfile(): ColorProfile {
    if (this.pickedColors.length === 0) {
      return {
        dominantHues: [],
        saturationMean: 0.7,
        brightnessProfile: [0.2, 0.5, 0.3],
        warmthCoolBalance: 0,
      };
    }

    const sorted = [...this.pickedColors].sort((a, b) => b.weight - a.weight);
    const dominantHues = sorted.map((c) => c.h);
    const saturationMean =
      this.pickedColors.reduce((s, c) => s + c.s * c.weight, 0) /
      this.pickedColors.reduce((s, c) => s + c.weight, 0);

    // Brightness distribution: dark (<0.4), mid (0.4-0.6), light (>0.6)
    const total = this.pickedColors.length;
    const dark = this.pickedColors.filter((c) => c.l < 0.4).length / total;
    const mid = this.pickedColors.filter((c) => c.l >= 0.4 && c.l <= 0.6).length / total;
    const light = this.pickedColors.filter((c) => c.l > 0.6).length / total;

    // Warmth: reds (0-30, 330-360) and yellows/oranges (30-80) are warm
    const warmth = this.pickedColors.reduce((sum, c) => {
      const isWarm = (c.h >= 0 && c.h <= 80) || c.h >= 330;
      const isCool = c.h >= 160 && c.h <= 270;
      return sum + (isWarm ? c.weight : isCool ? -c.weight : 0);
    }, 0);
    const totalWeight = this.pickedColors.reduce((s, c) => s + c.weight, 0);
    const warmthCoolBalance = Math.max(-1, Math.min(1, warmth / totalWeight));

    return {
      dominantHues,
      saturationMean,
      brightnessProfile: [dark, mid, light],
      warmthCoolBalance,
    };
  }

  hasContent(): boolean {
    return this.pickedColors.length > 0;
  }

  dispose(): void {
    window.removeEventListener("resize", this.boundResize);
    this.container.remove();
  }
}
