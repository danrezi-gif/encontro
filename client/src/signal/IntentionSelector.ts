/**
 * Intention symbol selector — a felt-sense selection, not a description.
 *
 * These are pre-linguistic markers of inner state — something closer to
 * Jungian archetypes or I Ching symbols than to tags or categories.
 * Not "I want to talk about consciousness." Something more somatic.
 */

interface IntentionSymbol {
  id: number;
  /** SVG path data for the glyph */
  glyph: string;
  /** Pre-linguistic label — evocative, not descriptive */
  label: string;
  /** The dimension this symbol represents */
  dimension: "threshold" | "depth" | "expansion" | "containment" | "dissolution" | "emergence";
  /** Embedding vector element (used in resonance score) */
  embedding: number[];
}

const INTENTION_SYMBOLS: IntentionSymbol[] = [
  {
    id: 0,
    label: "threshold",
    glyph: `<line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="1.5"/>`,
    dimension: "threshold",
    embedding: [1, 0, 0, 0, 0, 0, 0.5, 0],
  },
  {
    id: 1,
    label: "descent",
    glyph: `<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="1.5"/>
            <line x1="16" y1="32" x2="24" y2="40" stroke="currentColor" stroke-width="1.5"/>
            <line x1="32" y1="32" x2="24" y2="40" stroke="currentColor" stroke-width="1.5"/>`,
    dimension: "depth",
    embedding: [0, 1, 0, 0, 0, 0, 0.8, 0.2],
  },
  {
    id: 2,
    label: "opening",
    glyph: `<path d="M 24 4 Q 44 24 24 44 Q 4 24 24 4" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    dimension: "expansion",
    embedding: [0, 0, 1, 0, 0, 0, 0.3, 0.9],
  },
  {
    id: 3,
    label: "enclosure",
    glyph: `<circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="1"/>`,
    dimension: "containment",
    embedding: [0, 0, 0, 1, 0, 0, 0.9, 0.1],
  },
  {
    id: 4,
    label: "dissolve",
    glyph: `<line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" stroke-width="1.5" opacity="0.9"/>
            <line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
            <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="1" opacity="0.3"/>
            <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="1" opacity="0.3"/>`,
    dimension: "dissolution",
    embedding: [0, 0, 0, 0, 1, 0, 0.2, 0.7],
  },
  {
    id: 5,
    label: "emergence",
    glyph: `<path d="M 24 40 L 24 16" stroke="currentColor" stroke-width="1.5"/>
            <path d="M 24 16 L 16 26" stroke="currentColor" stroke-width="1.5"/>
            <path d="M 24 16 L 32 26" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="40" r="4" fill="none" stroke="currentColor" stroke-width="1"/>`,
    dimension: "emergence",
    embedding: [0, 0, 0, 0, 0, 1, 0.6, 0.8],
  },
  {
    id: 6,
    label: "witness",
    glyph: `<ellipse cx="24" cy="24" rx="18" ry="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="24" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="24" cy="24" r="1.5" fill="currentColor"/>`,
    dimension: "depth",
    embedding: [0.2, 0.8, 0, 0.4, 0, 0, 1, 0],
  },
  {
    id: 7,
    label: "longing",
    glyph: `<path d="M 24 38 C 4 24 4 10 24 10 C 44 10 44 24 24 38" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <line x1="24" y1="38" x2="24" y2="44" stroke="currentColor" stroke-width="1" opacity="0.4"/>`,
    dimension: "threshold",
    embedding: [0.9, 0.3, 0.5, 0, 0, 0.2, 0, 1],
  },
  {
    id: 8,
    label: "rest",
    glyph: `<line x1="8" y1="20" x2="40" y2="20" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" stroke-width="1"/>
            <line x1="8" y1="34" x2="40" y2="34" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>`,
    dimension: "containment",
    embedding: [0, 0, 0, 0.8, 0.2, 0, 0.5, 0],
  },
  {
    id: 9,
    label: "fracture",
    glyph: `<path d="M 14 8 L 20 22 L 16 22 L 28 40" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M 30 40 L 36 28" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>`,
    dimension: "dissolution",
    embedding: [0.5, 0, 0, 0, 0.9, 0.3, 0, 0.4],
  },
  {
    id: 10,
    label: "spiral",
    glyph: `<path d="M 24 24 m 0 -12 a 12 12 0 1 1 -0.1 0 m 0.1 0 m -3 0 a 9 9 0 1 0 0.1 0 m -0.1 0 m 3 0 a 6 6 0 1 1 -0.1 0" fill="none" stroke="currentColor" stroke-width="1.2"/>`,
    dimension: "expansion",
    embedding: [0, 0, 0.9, 0, 0.3, 0.5, 0, 0],
  },
  {
    id: 11,
    label: "meeting",
    glyph: `<circle cx="16" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="32" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="1.2"/>
            <path d="M 20 16 Q 24 12 28 16" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
            <path d="M 20 32 Q 24 36 28 32" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>`,
    dimension: "emergence",
    embedding: [0.4, 0, 0.6, 0.4, 0, 0.8, 0, 0.6],
  },
];

export class IntentionSelector {
  private container: HTMLElement;
  private selectedIds: Set<number> = new Set();
  private maxSelections = 3;
  private colorHue = 220;
  private onChangeCallback?: (vector: number[]) => void;

  constructor(parent: HTMLElement, colorHue = 220) {
    this.colorHue = colorHue;
    this.container = document.createElement("div");
    this.container.className = "flex flex-col items-center gap-4 w-full";
    this.render();
    parent.appendChild(this.container);
  }

  onChange(cb: (vector: number[]) => void): void {
    this.onChangeCallback = cb;
  }

  setColorHue(hue: number): void {
    this.colorHue = hue;
    this.updateAllButtonColors();
  }

  private render(): void {
    this.container.innerHTML = `
      <p class="text-xs opacity-30 font-light text-center max-w-xs leading-relaxed">
        choose up to three symbols that resonate with your current state<br>
        <span class="opacity-60">not what you think — what you feel</span>
      </p>
      <div id="intention-grid" class="grid grid-cols-4 gap-2 w-full max-w-xs"></div>
      <p id="intention-count" class="text-xs opacity-20 font-light"></p>
    `;

    const grid = this.container.querySelector("#intention-grid")!;
    for (const sym of INTENTION_SYMBOLS) {
      const btn = document.createElement("button");
      btn.dataset.symbolId = String(sym.id);
      btn.className = `
        flex flex-col items-center justify-center gap-1
        p-2 rounded-lg border border-white/10
        transition-all duration-300 select-none
        hover:border-white/30 active:scale-95
      `;
      btn.style.minHeight = "64px";
      btn.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 48 48" class="opacity-60 transition-opacity duration-300">
          ${sym.glyph}
        </svg>
        <span class="text-[9px] font-light opacity-30 leading-none">${sym.label}</span>
      `;
      btn.addEventListener("click", () => this.toggleSymbol(sym.id));
      grid.appendChild(btn);
    }
  }

  private toggleSymbol(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.updateButtonState(id, false);
    } else if (this.selectedIds.size < this.maxSelections) {
      this.selectedIds.add(id);
      this.updateButtonState(id, true);
    }

    this.updateCount();
    this.emitChange();
  }

  private updateButtonState(id: number, active: boolean): void {
    const btn = this.container.querySelector(`[data-symbol-id="${id}"]`) as HTMLElement;
    if (!btn) return;
    const svg = btn.querySelector("svg") as SVGElement | null;
    const label = btn.querySelector("span") as HTMLElement | null;

    if (active) {
      btn.style.borderColor = `hsl(${this.colorHue}, 50%, 45%)`;
      btn.style.backgroundColor = `hsla(${this.colorHue}, 50%, 20%, 0.3)`;
      btn.style.boxShadow = `0 0 12px 2px hsla(${this.colorHue}, 70%, 40%, 0.2)`;
      if (svg) { svg.style.opacity = "1"; svg.style.color = `hsl(${this.colorHue}, 60%, 70%)`; }
      if (label) label.style.opacity = "0.8";
    } else {
      btn.style.borderColor = "";
      btn.style.backgroundColor = "";
      btn.style.boxShadow = "";
      if (svg) { svg.style.opacity = "0.5"; svg.style.color = ""; }
      if (label) label.style.opacity = "0.3";
    }
  }

  private updateAllButtonColors(): void {
    for (const id of this.selectedIds) {
      this.updateButtonState(id, true);
    }
  }

  private updateCount(): void {
    const count = this.container.querySelector("#intention-count") as HTMLElement;
    if (!count) return;
    const n = this.selectedIds.size;
    count.textContent = n === 0
      ? ""
      : n === this.maxSelections
        ? "signal complete"
        : `${this.maxSelections - n} more ${this.maxSelections - n === 1 ? "symbol" : "symbols"}`;
    count.style.opacity = n > 0 ? "0.4" : "0";
  }

  private emitChange(): void {
    if (!this.onChangeCallback) return;
    this.onChangeCallback(this.encodeVector());
  }

  encodeVector(): number[] {
    // Average of selected symbol embeddings
    if (this.selectedIds.size === 0) return [];

    const selected = [...this.selectedIds].map((id) => INTENTION_SYMBOLS[id].embedding);
    const dim = selected[0].length;
    const avg = new Array(dim).fill(0);

    for (const emb of selected) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }

    return avg.map((v) => v / selected.length);
  }

  hasContent(): boolean {
    return this.selectedIds.size > 0;
  }

  dispose(): void {
    this.container.remove();
  }
}
