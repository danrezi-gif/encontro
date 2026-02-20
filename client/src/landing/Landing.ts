/**
 * Landing — the first thing you see.
 *
 * A dark, breathing field of particles with the project name
 * and a single invitation to enter. Sets the tone before anything
 * interactive begins.
 */
export class Landing {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDisposed = false;
  private onEnterCallback?: () => void;
  private particles: LandingParticle[] = [];
  private frame = 0;

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.id = "landing";
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 60;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #000;
      font-family: 'Inter', sans-serif;
      cursor: default;
      overflow: hidden;
    `;

    // Background particle canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = `
      position: absolute; inset: 0;
      width: 100%; height: 100%;
    `;
    this.container.appendChild(this.canvas);

    // Content overlay
    const content = document.createElement("div");
    content.style.cssText = `
      position: relative; z-index: 1;
      display: flex; flex-direction: column;
      align-items: center; gap: 0;
      text-align: center;
      padding: 0 24px;
    `;

    // Title
    const title = document.createElement("h1");
    title.textContent = "encontro";
    title.style.cssText = `
      font-size: 2.5rem; font-weight: 300;
      letter-spacing: 0.35em; color: rgba(255,255,255,0.7);
      margin: 0 0 12px 0;
      text-transform: lowercase;
    `;

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "a ceremony of encounter";
    subtitle.style.cssText = `
      font-size: 0.75rem; font-weight: 300;
      letter-spacing: 0.2em; color: rgba(255,255,255,0.2);
      margin: 0 0 48px 0;
    `;

    // Description
    const desc = document.createElement("p");
    desc.style.cssText = `
      font-size: 0.7rem; font-weight: 300;
      line-height: 1.8; color: rgba(255,255,255,0.15);
      max-width: 320px; margin: 0 0 56px 0;
    `;
    desc.textContent =
      "you will create a signal — color, gesture, sound, intention — " +
      "an expressive artifact of your current state. " +
      "not your identity. just this moment.";

    // Enter button
    const enterBtn = document.createElement("button");
    enterBtn.textContent = "begin";
    enterBtn.style.cssText = `
      font-size: 0.8rem; font-weight: 300;
      letter-spacing: 0.15em; color: rgba(255,255,255,0.5);
      background: transparent;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 999px;
      padding: 14px 48px;
      cursor: pointer;
      transition: all 0.6s ease;
    `;
    enterBtn.addEventListener("mouseenter", () => {
      enterBtn.style.borderColor = "rgba(255,255,255,0.3)";
      enterBtn.style.color = "rgba(255,255,255,0.8)";
      enterBtn.style.boxShadow = "0 0 30px 8px rgba(255,255,255,0.03)";
    });
    enterBtn.addEventListener("mouseleave", () => {
      enterBtn.style.borderColor = "rgba(255,255,255,0.12)";
      enterBtn.style.color = "rgba(255,255,255,0.5)";
      enterBtn.style.boxShadow = "none";
    });
    enterBtn.addEventListener("click", () => this.enter());

    // Version tag
    const version = document.createElement("p");
    version.textContent = "phase 0 — signal canvas";
    version.style.cssText = `
      font-size: 0.6rem; font-weight: 300;
      letter-spacing: 0.15em; color: rgba(255,255,255,0.08);
      margin: 32px 0 0 0;
    `;

    content.appendChild(title);
    content.appendChild(subtitle);
    content.appendChild(desc);
    content.appendChild(enterBtn);
    content.appendChild(version);
    this.container.appendChild(content);

    parent.appendChild(this.container);

    this.ctx = this.canvas.getContext("2d");
    this.initParticles();
    this.animate();

    // Fade in
    this.container.style.opacity = "0";
    this.container.style.transition = "opacity 2s ease";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.container.style.opacity = "1";
      });
    });
  }

  onEnter(cb: () => void): void {
    this.onEnterCallback = cb;
  }

  private initParticles(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const count = Math.min(120, Math.floor((this.canvas.width * this.canvas.height) / 8000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.05,
        hue: Math.random() * 60 + 200, // cool blues to purples
        phase: Math.random() * Math.PI * 2,
      });
    }

    window.addEventListener("resize", () => {
      if (this.isDisposed) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  private animate(): void {
    if (this.isDisposed || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Soft fade instead of full clear — creates trailing effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, w, h);

    const t = this.frame * 0.01;

    for (const p of this.particles) {
      // Drift
      p.x += p.vx + Math.sin(t + p.phase) * 0.05;
      p.y += p.vy + Math.cos(t * 0.7 + p.phase) * 0.05;

      // Wrap
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      if (p.y > h + 10) p.y = -10;

      // Breathing alpha
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.5 + p.phase);
      const alpha = p.alpha * (0.4 + 0.6 * breathe);

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 40%, 60%, ${alpha})`;
      ctx.fill();

      // Subtle glow for brighter particles
      if (p.alpha > 0.2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 50%, 50%, ${alpha * 0.15})`;
        ctx.fill();
      }
    }

    // Draw faint connection lines between close particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const lineAlpha = (1 - dist / 100) * 0.04;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(180, 200, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    this.frame++;
    requestAnimationFrame(() => this.animate());
  }

  private enter(): void {
    // Fade out
    this.container.style.transition = "opacity 1.5s ease";
    this.container.style.opacity = "0";
    setTimeout(() => {
      this.dispose();
      this.onEnterCallback?.();
    }, 1600);
  }

  dispose(): void {
    this.isDisposed = true;
    this.container.remove();
  }
}

interface LandingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
  phase: number;
}
