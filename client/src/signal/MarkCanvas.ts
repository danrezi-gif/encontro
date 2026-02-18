import type { MarkProfile } from "@shared/SignalArtifact";

interface StrokePoint {
  x: number;
  y: number;
  t: number;        // timestamp (ms)
  pressure: number; // 0-1 (1.0 if not available)
}

/**
 * Mark canvas — a single freehand gesture on a blank surface.
 *
 * The quality of line, pressure, speed, direction — these carry information
 * the maker may not consciously intend. That's the point.
 *
 * One mark only. The discipline of limitation is part of the gesture.
 */
export class MarkCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;

  private strokePoints: StrokePoint[] = [];
  private allStrokes: StrokePoint[][] = [];
  private isDrawing = false;
  private hasMark = false;
  private colorHue = 0; // passed in from color step

  private onChangeCallback?: (profile: MarkProfile) => void;

  constructor(parent: HTMLElement, colorHue = 220) {
    this.colorHue = colorHue;

    this.container = document.createElement("div");
    this.container.className = "relative flex flex-col items-center gap-3";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "cursor-crosshair touch-none";
    this.canvas.style.cssText = `
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 4px;
      background: rgba(0,0,0,0.4);
    `;

    const hint = document.createElement("div");
    hint.id = "mark-hint";
    hint.className = "text-xs opacity-30 font-light transition-opacity duration-500";
    hint.textContent = "draw a single gesture — don't think, just move";

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "clear";
    clearBtn.className = `
      text-xs opacity-0 font-light px-3 py-1 border border-white/10 rounded-full
      hover:border-white/30 hover:opacity-40 transition-all duration-300
    `;
    clearBtn.id = "mark-clear-btn";
    clearBtn.addEventListener("click", () => this.clear());

    this.container.appendChild(this.canvas);
    this.container.appendChild(hint);
    this.container.appendChild(clearBtn);
    parent.appendChild(this.container);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    this.ctx = ctx;

    this.setupEventListeners();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  onChange(cb: (profile: MarkProfile) => void): void {
    this.onChangeCallback = cb;
  }

  setColorHue(hue: number): void {
    this.colorHue = hue;
  }

  private resize(): void {
    const w = Math.min(this.container.offsetWidth, 320);
    const h = Math.round(w * 0.65);
    this.canvas.width = w;
    this.canvas.height = h;
    this.redrawAll();
  }

  private setupEventListeners(): void {
    const getPos = (e: MouseEvent | Touch): { x: number; y: number; pressure: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
        pressure: (e as PointerEvent).pressure ?? 1.0,
      };
    };

    this.canvas.addEventListener("mousedown", (e) => {
      this.startStroke(getPos(e));
    });
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDrawing) this.continueStroke(getPos(e));
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (this.isDrawing) this.endStroke(getPos(e));
    });
    this.canvas.addEventListener("mouseleave", () => {
      if (this.isDrawing) this.endCurrentStroke();
    });

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.startStroke(getPos(t));
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (this.isDrawing) this.continueStroke(getPos(t));
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (this.isDrawing) this.endStroke(getPos(t));
    }, { passive: false });
  }

  private startStroke(pos: { x: number; y: number; pressure: number }): void {
    this.isDrawing = true;
    this.strokePoints = [];
    this.addPoint(pos);

    // Fade hint once drawing starts
    const hint = this.container.querySelector("#mark-hint") as HTMLElement;
    if (hint) hint.style.opacity = "0";
  }

  private continueStroke(pos: { x: number; y: number; pressure: number }): void {
    this.addPoint(pos);
    this.drawSegment();
  }

  private endStroke(pos: { x: number; y: number; pressure: number }): void {
    this.addPoint(pos);
    this.endCurrentStroke();
  }

  private endCurrentStroke(): void {
    this.isDrawing = false;
    if (this.strokePoints.length > 1) {
      this.allStrokes.push([...this.strokePoints]);
      this.hasMark = true;

      // Show clear button
      const clearBtn = this.container.querySelector("#mark-clear-btn") as HTMLElement;
      if (clearBtn) clearBtn.style.opacity = "";

      this.emitChange();
    }
    this.strokePoints = [];
  }

  private addPoint(pos: { x: number; y: number; pressure: number }): void {
    this.strokePoints.push({
      x: pos.x,
      y: pos.y,
      t: Date.now(),
      pressure: pos.pressure,
    });
  }

  private drawSegment(): void {
    if (this.strokePoints.length < 2) return;

    const ctx = this.ctx;
    const pts = this.strokePoints;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];

    const velocity = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) / Math.max(b.t - a.t, 1);
    const lineWidth = Math.max(0.5, Math.min(4, 1.5 + b.pressure * 2 - velocity * 0.3));
    const alpha = Math.max(0.3, Math.min(0.9, 0.5 + b.pressure * 0.4));

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `hsla(${this.colorHue}, 70%, 65%, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Glow on slow, deliberate strokes
    if (velocity < 0.5) {
      ctx.shadowColor = `hsl(${this.colorHue}, 70%, 65%)`;
      ctx.shadowBlur = 6;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private redrawAll(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const savedStrokes = this.allStrokes;
    const savedStrokePoints = this.strokePoints;

    for (const stroke of savedStrokes) {
      this.strokePoints = stroke;
      for (let i = 1; i < stroke.length; i++) {
        this.drawSegment();
      }
    }

    this.strokePoints = savedStrokePoints;
  }

  private clear(): void {
    this.allStrokes = [];
    this.hasMark = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const hint = this.container.querySelector("#mark-hint") as HTMLElement;
    if (hint) hint.style.opacity = "";
    const clearBtn = this.container.querySelector("#mark-clear-btn") as HTMLElement;
    if (clearBtn) clearBtn.style.opacity = "0";

    this.emitChange();
  }

  private emitChange(): void {
    if (!this.onChangeCallback) return;
    this.onChangeCallback(this.encodeProfile());
  }

  encodeProfile(): MarkProfile {
    if (!this.hasMark || this.allStrokes.length === 0) {
      return {
        strokeVelocityMean: 0,
        directionality: 0,
        closureIndex: 0,
        densityMap: new Array(9).fill(0),
        coverage: 0,
      };
    }

    const allPoints = this.allStrokes.flat();
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Velocity
    let totalVelocity = 0;
    let velocityCount = 0;
    for (const stroke of this.allStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1];
        const b = stroke[i];
        const dt = Math.max(b.t - a.t, 1);
        const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
        totalVelocity += dist / dt;
        velocityCount++;
      }
    }
    const rawVelocity = velocityCount > 0 ? totalVelocity / velocityCount : 0;
    const strokeVelocityMean = Math.min(1, rawVelocity / 5.0);

    // Directionality — how consistent is the overall direction?
    let dx = 0;
    let dy = 0;
    let count = 0;
    for (const stroke of this.allStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        dx += stroke[i].x - stroke[i - 1].x;
        dy += stroke[i].y - stroke[i - 1].y;
        count++;
      }
    }
    const meanDx = dx / Math.max(count, 1);
    const meanDy = dy / Math.max(count, 1);
    const netMag = Math.sqrt(meanDx ** 2 + meanDy ** 2);

    // Compute variance around the net direction
    let variance = 0;
    for (const stroke of this.allStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        const segDx = stroke[i].x - stroke[i - 1].x;
        const segDy = stroke[i].y - stroke[i - 1].y;
        const mag = Math.sqrt(segDx ** 2 + segDy ** 2);
        if (mag > 0) {
          const dot = (segDx * meanDx + segDy * meanDy) / (mag * Math.max(netMag, 0.001));
          variance += 1 - Math.abs(dot);
        }
      }
    }
    const directionality = 1 - Math.min(1, variance / Math.max(count, 1));

    // Closure — how close is end point to start point?
    const first = allPoints[0];
    const last = allPoints[allPoints.length - 1];
    const closeDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    const spread = Math.sqrt(w ** 2 + h ** 2);
    const closureIndex = Math.max(0, 1 - closeDist / spread);

    // 3x3 density map
    const densityMap = new Array(9).fill(0);
    for (const p of allPoints) {
      const gx = Math.floor((p.x / w) * 3);
      const gy = Math.floor((p.y / h) * 3);
      const zone = Math.min(8, gy * 3 + Math.min(2, gx));
      densityMap[zone]++;
    }
    const maxDensity = Math.max(1, ...densityMap);
    const normalized = densityMap.map((d) => d / maxDensity);

    // Coverage — total path length relative to canvas diagonal
    let pathLength = 0;
    for (const stroke of this.allStrokes) {
      for (let i = 1; i < stroke.length; i++) {
        pathLength += Math.sqrt(
          (stroke[i].x - stroke[i - 1].x) ** 2 +
          (stroke[i].y - stroke[i - 1].y) ** 2
        );
      }
    }
    const coverage = Math.min(1, pathLength / spread);

    return {
      strokeVelocityMean,
      directionality,
      closureIndex,
      densityMap: normalized,
      coverage,
    };
  }

  hasContent(): boolean {
    return this.hasMark;
  }

  dispose(): void {
    window.removeEventListener("resize", () => this.resize());
    this.container.remove();
  }
}
