/**
 * Pre-ceremony waiting space UI.
 * Minimal DOM overlay — shows room code, participant count, ready button.
 */
export class LobbyUI {
  private container: HTMLElement;

  constructor(uiRoot: HTMLElement) {
    this.container = document.createElement("div");
    this.container.className = "flex flex-col items-center justify-center h-full";
    this.container.innerHTML = `
      <div class="text-center space-y-6 p-8">
        <h1 class="text-3xl font-light tracking-wider opacity-80">encontro</h1>
        <p class="text-sm opacity-50 font-light">soul encounters in virtual space</p>
        <div id="lobby-status" class="text-sm opacity-60"></div>
        <button id="lobby-ready-btn"
          class="px-8 py-3 border border-white/20 rounded-full text-sm font-light
                 hover:bg-white/10 transition-all opacity-70 hover:opacity-100">
          enter ceremony
        </button>
      </div>
    `;
    uiRoot.appendChild(this.container);
  }

  setStatus(text: string): void {
    const el = this.container.querySelector("#lobby-status");
    if (el) el.textContent = text;
  }

  onReady(callback: () => void): void {
    const btn = this.container.querySelector("#lobby-ready-btn");
    btn?.addEventListener("click", callback);
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
