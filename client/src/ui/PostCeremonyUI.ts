/**
 * Post-ceremony reflection UI.
 * Minimal prompts for integration.
 *
 * TODO: Implement
 * - Subtle fade-in after ceremony complete
 * - Simple reflection prompt
 * - Option to rejoin lobby
 */
export class PostCeremonyUI {
  private container: HTMLElement;

  constructor(uiRoot: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "flex flex-col items-center justify-center h-full";
    this.container.style.display = "none";
    this.container.innerHTML = `
      <div class="text-center space-y-6 p-8">
        <p class="text-lg font-light tracking-wider opacity-60">the ceremony has ended</p>
        <p class="text-sm opacity-40 font-light">carry the warmth with you</p>
      </div>
    `;
    uiRoot.appendChild(this.container);
  }

  show(): void {
    this.container.style.display = "";
  }

  hide(): void {
    this.container.style.display = "none";
  }

  dispose(): void {
    this.container.remove();
  }
}
