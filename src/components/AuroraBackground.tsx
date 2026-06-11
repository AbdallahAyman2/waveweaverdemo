import React, { useEffect, useRef } from "react";

interface AuroraBackgroundProps {
  theme?: "light" | "dark";
}

class SilkLines {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lines: {
    y: number;
    phaseOffset: number;
    segments: {
      x: number;
      displaceX: number;
      displaceY: number;
      angleOffset: number;
    }[];
  }[] = [];
  mouseX: number = -1000;
  mouseY: number = -1000;
  targetMouseX: number = -1000;
  targetMouseY: number = -1000;
  time: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initLines();
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.initLines();
  }

  initLines() {
    this.lines = [];
    const LINE_COUNT = 15; // Even fewer premium silk threads for a minimalist design
    const segmentCount = Math.max(90, Math.floor(this.width / 14)); // Dense adaptive segments for flawless rendering curvature
    
    for (let i = 0; i < LINE_COUNT; i++) {
      const y = ((i + 1) / (LINE_COUNT + 1)) * this.height;
      const segments = [];
      const phaseOffset = Math.random() * Math.PI * 2;
      for (let j = 0; j <= segmentCount; j++) {
        segments.push({
          x: (j / segmentCount) * this.width,
          displaceX: 0,
          displaceY: 0,
          angleOffset: Math.random() * Math.PI * 2,
        });
      }
      this.lines.push({ y, phaseOffset, segments });
    }
  }

  handleMouseMove(clientX: number, clientY: number) {
    this.targetMouseX = clientX;
    this.targetMouseY = clientY;
  }

  updateAndDraw() {
    this.time += 0.012; // Controls slow ambient breeze crawling speed

    // Smooth coordinate displacement lagging (flyweight low pass filter)
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.12;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.12;

    // Draw solid elegant deep black backdrop
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.width, this.height);

    const influenceRadius = 145; // Localized circular bubble radius
    const maxDisplacement = 45;  // Push away power

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const ambientBreeze = Math.sin(this.time * 0.8 + line.phaseOffset) * 1.5;

      this.ctx.beginPath();
      
      // Gorgeous subtle silver-white gradient that drops to transparent at container margins
      const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.0)");
      gradient.addColorStop(0.12, "rgba(255, 255, 255, 0.22)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.45)");
      gradient.addColorStop(0.88, "rgba(255, 255, 255, 0.22)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 4.0; // Thicker strings as requested by the user

      for (let j = 0; j < line.segments.length; j++) {
        const seg = line.segments[j];
        const dx = seg.x - this.mouseX;
        const dy = line.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetDisplaceX = 0;
        let targetDisplaceY = 0;

        if (dist < influenceRadius) {
          // Double differentiable flat-topped cosine curve (Hann window) - no pointy peaks!
          const t = dist / influenceRadius;
          const factor = 0.5 * (1 + Math.cos(t * Math.PI)); // Completely smooth bell curve

          // Pure directional push vectors
          const dirX = dx / (dist + 0.1);
          const dirY = dy / (dist + 0.1);

          // Center softening: smoothly scales down the push factor when directly in the center to maintain perfect round loops
          const centerSoftening = Math.sin(t * Math.PI / 2);

          // Random continuous dispersion/shimmer away from the cursor
          const dispersion = Math.sin(this.time * 26 + seg.angleOffset) * 3.0 * factor;

          // Repulse outwards in a gorgeous smooth cylinder/lens bubble
          targetDisplaceX = dirX * maxDisplacement * factor * centerSoftening + dispersion * 0.3;
          targetDisplaceY = dirY * maxDisplacement * factor * centerSoftening + dispersion;
        }

        // Dampened physical spring easing
        seg.displaceX += (targetDisplaceX - seg.displaceX) * 0.15;
        seg.displaceY += (targetDisplaceY - seg.displaceY) * 0.15;

        const x = seg.x + seg.displaceX;
        const y = line.y + ambientBreeze + seg.displaceY;

        if (j === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.save();
      this.ctx.shadowBlur = 3;
      this.ctx.shadowColor = "rgba(255, 255, 255, 0.25)";
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
}

export default function AuroraBackground({ theme = "light" }: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const silkLinesInstanceRef = useRef<SilkLines | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;

    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let time = 0;

    const handleResize = () => {
      if (theme === "dark") {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.width = window.innerWidth * dpr;
        height = canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);

        if (silkLinesInstanceRef.current) {
          silkLinesInstanceRef.current.resize(window.innerWidth, window.innerHeight);
        } else {
          silkLinesInstanceRef.current = new SilkLines(canvas, ctx, window.innerWidth, window.innerHeight);
        }
      } else {
        width = canvas.width = 120;
        height = canvas.height = 80;
        silkLinesInstanceRef.current = null;
      }
    };

    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX / window.innerWidth - 0.5;
      mouse.targetY = e.clientY / window.innerHeight - 0.5;

      if (containerRef.current) {
        containerRef.current.style.setProperty("--m-x", mouse.targetX.toFixed(4));
        containerRef.current.style.setProperty("--m-y", mouse.targetY.toFixed(4));
      }

      if (theme === "dark" && silkLinesInstanceRef.current) {
        // High fidelity mouse position tracking alignment
        silkLinesInstanceRef.current.handleMouseMove(e.clientX, e.clientY);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const colors = [
      { r: 100, g: 66, b: 214 }, // aurora-purple: #6442D6
      { r: 236, g: 72, b: 153 }, // aurora-magenta: #EC4899
      { r: 20, g: 184, b: 166 },  // aurora-teal: #14B8A6
      { r: 139, g: 92, b: 246 },  // violet
    ];

    const draw = () => {
      if (theme === "dark") {
        if (!silkLinesInstanceRef.current) {
          silkLinesInstanceRef.current = new SilkLines(canvas, ctx, window.innerWidth, window.innerHeight);
        }
        silkLinesInstanceRef.current.updateAndDraw();
      } else {
        mouse.x += (mouse.targetX - mouse.x) * 0.08;
        mouse.y += (mouse.targetY - mouse.y) * 0.08;

        ctx.clearRect(0, 0, width, height);
        time += 0.003;

        colors.forEach((color, i) => {
          ctx.globalAlpha = 0.35 + 0.08 * Math.sin(time + i);
          ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

          const offsetY = height * (0.05 + i * 0.08);
          const offsetX = mouse.x * 2.5 * (i + 1);

          ctx.beginPath();
          ctx.moveTo(0, height);

          const pointSpacing = 20;
          for (let x = 0; x <= width + pointSpacing; x += pointSpacing) {
            const lfo =
              Math.sin(x * 0.02 + time * 1.5 + i) * (height * 0.22) +
              Math.cos(x * 0.04 - time * 0.8 + i * 2) * (height * 0.1);
            const y = offsetY + lfo;

            ctx.lineTo(x + offsetX, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [theme]);

  const canvasClasses =
    theme === "dark"
      ? "absolute inset-0 w-full h-full opacity-100 z-0 scale-100 transition-all duration-700 ease-in-out"
      : "absolute inset-0 w-full h-full opacity-65 md:opacity-80 z-0 blur-[60px] md:blur-[100px] scale-115 transition-all duration-700 ease-in-out";

  // Fixed visual viewport layout ensures the background is static and matches screen-space tracking coordinates completely!
  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
      <canvas ref={canvasRef} className={canvasClasses} style={theme === "light" ? { mixBlendMode: "multiply" } : undefined} />

      {theme === "light" && (
        <div className="absolute inset-0 bg-radial-[circle_at_center_rgba(255,255,255,0.45)_0%,_#F8FAFC_100%] pointer-events-none z-0" />
      )}

      {theme === "light" && (
        <>
          {/* Top-left cyan blur */}
          <div className="absolute top-[-10%] left-[-10%] w-[700px] md:w-[900px] h-[700px] md:h-[900px] rounded-full bg-cyan-200/35 blur-[110px] pointer-events-none" />
          {/* Center-top indigo blur directly behind the prompt box (Generator Card) */}
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[500px] md:h-[700px] rounded-full bg-indigo-200/30 blur-[120px] pointer-events-none" />
          {/* Top-right violet blur */}
          <div className="absolute top-[12%] right-[-5%] w-[600px] md:w-[850px] h-[600px] md:h-[850px] rounded-full bg-purple-200/30 blur-[100px] pointer-events-none" />
          {/* Saturated accent gold/pink light leak behind upper-middle center */}
          <div className="absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-pink-200/25 blur-[100px] pointer-events-none" />
          {/* Steady backdrop blur in bottom right */}
          <div className="absolute bottom-[-10%] right-[-10%] w-[750px] md:w-[1000px] h-[750px] md:h-[1000px] rounded-full bg-emerald-100/25 blur-[130px] pointer-events-none" />
        </>
      )}
    </div>
  );
}
