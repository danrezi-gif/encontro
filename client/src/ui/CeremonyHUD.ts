import type { CeremonyPhase } from "@shared/CeremonyPhase";

/**
 * Subtle phase indicator during ceremony.
 * Minimal — just a faint text showing the current phase.
 * Fades out after a few seconds, reappears on phase change.
 */
export class CeremonyHUD {
  private container: HTMLElement;
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(uiRoot: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className =
      "fixed top-8 left-1/2 -translate-x-1/2 text-center transition-opacity duration-2000";
    this.container.style.opacity = "0";
    uiRoot.appendChild(this.container);
  }

  showPhase(phase: CeremonyPhase): void {
    const displayName = phase.charAt(0).toUpperCase() + phase.slice(1);
    this.container.innerHTML = `
      <p class="text-lg font-light tracking-widest opacity-50">${displayName}</p>
    `;
    this.container.style.opacity = "1";

    // Fade out after 5 seconds
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => {
      this.container.style.opacity = "0";
    }, 5000);
  }

  dispose(): void {
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.container.remove();
  }
}
