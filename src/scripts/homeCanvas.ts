// Home page interactive canvas.
// Implements Bridson's Poisson disc sampling algorithm with color inheritance:
// each click plants 5 seed points in a cross pattern, all sharing the same color.
// Child points inherit their parent's color and are connected by a visible line,
// producing a colored spanning tree that fills the canvas.

import { createDrawer } from "./homeDrawer";

const canvas = document.getElementById("home-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const COLORS = ["#6050dc", "#ffd800", "#ff4f00", "#0081f7", "#9ed8ff", "#ffc4ed"];
let shuffledColors = [...COLORS];

let R = 5;                        // minimum distance between any two points
let K = 30;                       // max candidate attempts before removing a point from the active list
let W = R / Math.sqrt(2);         // grid cell size: guarantees at most one point per cell
let MARGIN = R * 1.3;             // keeps seeds and points away from the canvas border
let strokeWidth = 2;

let grid: ({ x: number; y: number } | undefined)[][] = [];
let active: { pos: { x: number; y: number }; color: string }[] = [];
let nCols = 0;
let nRows = 0;
let animId = 0;
let colorIndex = 0;

// --- Canvas-specific styles (hint ripple + algo popup) ---

const canvasStyle = document.createElement("style");
canvasStyle.textContent = `
    @keyframes canvas-ripple {
        0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
        100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
    }

    @keyframes algo-popup-in {
        0%   { opacity: 0; transform: translateY(6px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0)   scale(1); }
    }

    .algo-popup {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 14px 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        text-decoration: none;
        color: var(--text);
        font-size: 0.8rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        animation: algo-popup-in 0.35s ease forwards;
        transition: border-color 0.15s, box-shadow 0.15s;
        max-width: 220px;
        z-index: 10;
    }
    .algo-popup:hover {
        border-color: var(--accent);
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .algo-popup-icon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--accent);
        color: #000;
        font-size: 0.85rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .algo-popup-text strong {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 1px;
    }
    .algo-popup-text span {
        font-size: 0.7rem;
        color: var(--text-muted);
        line-height: 1.3;
    }
    .algo-popup-dismiss {
        position: absolute;
        top: 5px;
        right: 7px;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 0.75rem;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        opacity: 0.6;
    }
    .algo-popup-dismiss:hover { opacity: 1; }
`;
document.head.appendChild(canvasStyle);

(canvas.parentElement as HTMLElement).style.position = "relative";

// --- Hint ripple ---
// Shows animated ripple rings at random positions to suggest the canvas is interactive.
// Stops permanently on the first click.

let hintActive = true;
let hintTimeout = 0;

function spawnHintRipple() {
    if (!hintActive) return;

    const parent = canvas.parentElement!;
    parent.querySelectorAll(".canvas-hint").forEach((el) => el.remove());

    const x = MARGIN + Math.random() * (canvas.width - 2 * MARGIN);
    const y = MARGIN + Math.random() * (canvas.height - 2 * MARGIN);

    // Scale from canvas resolution to CSS display size
    const scaleX = canvas.clientWidth / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;

    const wrapper = document.createElement("div");
    wrapper.className = "canvas-hint";
    wrapper.style.cssText = `position:absolute;left:${x * scaleX}px;top:${y * scaleY}px;width:0;height:0;pointer-events:none;`;

    // Two rings with a staggered delay for a double-pulse effect
    [0, 350].forEach((delay) => {
        const ring = document.createElement("div");
        ring.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1.5px solid var(--text-muted);
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
            animation: canvas-ripple 1.1s ease-out ${delay}ms forwards;
        `;
        wrapper.appendChild(ring);
    });

    parent.appendChild(wrapper);
    hintTimeout = window.setTimeout(spawnHintRipple, 3200);
}

function stopHint() {
    hintActive = false;
    clearTimeout(hintTimeout);
    canvas.parentElement?.querySelectorAll(".canvas-hint").forEach((el) => el.remove());
}

canvas.addEventListener("click", stopHint, { once: true });

// --- Drawer controls ---

function createControls() {
    createDrawer(
        canvas.parentElement!,
        { strokeWidth, R, colors: COLORS },
        {
            onStrokeWidth: (v) => { strokeWidth = v; ctx.lineWidth = v; },
            onR: (v) => { R = v; W = R / Math.sqrt(2); MARGIN = R * 1.3; init(); },
            onColorChange: (i, color) => { COLORS[i] = color; shuffledColors = [...COLORS]; },
        }
    );
}

// --- Poisson disc sampling ---

function getBgColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0f1115";
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function randomUnit(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

function inBounds(px: number, py: number): boolean {
    return px >= MARGIN && px <= canvas.width - MARGIN && py >= MARGIN && py <= canvas.height - MARGIN;
}

function init() {
    cancelAnimationFrame(animId);
    clearTimeout(hintTimeout);
    canvas.parentElement?.querySelectorAll(".canvas-hint").forEach((el) => el.remove());

    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    nCols = Math.floor(canvas.width / W);
    nRows = Math.floor(canvas.height / W);

    // 2D grid indexed by [row][col]; each cell holds at most one point
    grid = Array.from({ length: nRows }, () => new Array(nCols).fill(undefined));
    active = [];
    colorIndex = 0;

    // Shuffle colors so the order varies each reset
    shuffledColors = [...COLORS];
    for (let i = shuffledColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
    }

    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = strokeWidth;

    if (hintActive) hintTimeout = window.setTimeout(spawnHintRipple, 1500);
}

function loop() {
    // Process more steps when the active list is small to keep the animation
    // feeling continuous; slow down when many points compete for the CPU.
    const stepsPerFrame = Math.min(80, Math.max(25, Math.floor(400 / Math.max(active.length, 1))));
    for (let step = 0; step < stepsPerFrame; step++) {
        if (active.length === 0) return;

        const idx = Math.floor(Math.random() * active.length);
        const { pos, color } = active[idx];
        let found = false;

        for (let n = 0; n < K; n++) {
            const unit = randomUnit();
            const m = R + Math.random() * R; // random distance in [R, 2R]
            const sample = { x: unit.x * m + pos.x, y: unit.y * m + pos.y };

            const col = Math.floor(sample.x / W);
            const row = Math.floor(sample.y / W);

            if (!inBounds(sample.x, sample.y) || col < 0 || row < 0 || col >= nCols || row >= nRows || grid[row][col]) continue;

            // Check the 5x5 block of cells around the candidate.
            // Because W = R/sqrt(2), any point within distance R must be in this block.
            let ok = true;
            outer: for (let i = Math.max(row - 2, 0); i <= Math.min(row + 2, nRows - 1); i++) {
                for (let j = Math.max(col - 2, 0); j <= Math.min(col + 2, nCols - 1); j++) {
                    const nb = grid[i][j];
                    if (nb && dist(sample, nb) < R) {
                        ok = false;
                        break outer;
                    }
                }
            }

            if (ok) {
                found = true;
                grid[row][col] = sample;
                active.push({ pos: sample, color });

                // Draw a line from parent to child to visualize the spanning tree
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(sample.x, sample.y);
                ctx.stroke();

                break;
            }
        }

        if (!found) active.splice(idx, 1);
    }

    animId = requestAnimationFrame(loop);
}

// Tries to insert a single seed point at (sx, sy) with the given color.
// Returns false if the position is out of bounds or too close to an existing point.
function tryPlaceSeed(sx: number, sy: number, color: string): boolean {
    if (!inBounds(sx, sy)) return false;
    const col = Math.floor(sx / W);
    const row = Math.floor(sy / W);
    if (col < 0 || col >= nCols || row < 0 || row >= nRows || grid[row][col]) return false;

    for (let i = Math.max(row - 2, 0); i <= Math.min(row + 2, nRows - 1); i++) {
        for (let j = Math.max(col - 2, 0); j <= Math.min(col + 2, nCols - 1); j++) {
            const nb = grid[i][j];
            if (nb && dist({ x: sx, y: sy }, nb) < R) return false;
        }
    }

    const pos = { x: sx, y: sy };
    grid[row][col] = pos;
    active.push({ pos, color });
    return true;
}

canvas.addEventListener("click", (e) => {
    // Schedule the popup on the first click so it appears once the user has seen the animation
    schedulePopup();

    const rect = canvas.getBoundingClientRect();
    // Convert CSS pixel coordinates to canvas resolution coordinates
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const color = shuffledColors[colorIndex % shuffledColors.length];
    colorIndex++;

    // Plant 5 seeds in a cross pattern around the click point,
    // all sharing the same color so they form a single connected region.
    const spread = R * 8;
    const candidates = [
        { x, y },
        { x: x + spread, y },
        { x: x - spread, y },
        { x, y: y + spread },
        { x, y: y - spread },
    ];

    let anySeeded = false;
    for (const p of candidates) {
        if (tryPlaceSeed(p.x, p.y, color)) anySeeded = true;
    }

    if (!anySeeded) return;
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    init();
});

// Responsive: debounce resize to avoid thrashing during window drag
let resizeTimer = 0;
new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { init(); createControls(); }, 100);
}).observe(canvas.parentElement!);

// Theme-aware: restart when the theme class on <html> changes so the background color updates
new MutationObserver(() => { init(); }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
});

// --- "What is this?" popup ---
// Appears 5 s after the first canvas click; links to the Poisson disc blog post.
// Dismissed for the session once the user closes or follows the link.

let popupTimer = 0;

function showAlgoPopup() {
    const parent = canvas.parentElement!;
    if (parent.querySelector(".algo-popup")) return;

    const link = document.createElement("a");
    link.className = "algo-popup";
    link.href = "/blog/poisson-disc-sampling";

    link.innerHTML = `
        <div class="algo-popup-icon">?</div>
        <div class="algo-popup-text">
            <strong>What is this?</strong>
            <span>Poisson disc sampling - read the article</span>
        </div>
        <button class="algo-popup-dismiss" aria-label="Dismiss">✕</button>
    `;

    // Dismiss button removes the popup without following the link
    const dismiss = link.querySelector(".algo-popup-dismiss") as HTMLButtonElement;
    dismiss.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        link.remove();
    });

    parent.appendChild(link);
}

function schedulePopup() {
    clearTimeout(popupTimer);
    popupTimer = window.setTimeout(showAlgoPopup, 5000);
}

init();
createControls();
