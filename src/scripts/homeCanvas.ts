const canvas = document.getElementById("home-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const COLORS = ["#6050dc", "#ffd800", "#ff4f00", "#0081f7", "#9ed8ff", "#ffc4ed"];
let shuffledColors = [...COLORS];
const R = 5;
const K = 30;
const W = R / Math.sqrt(2);
const MARGIN = R * 1.3;

let grid: ({ x: number; y: number } | undefined)[][] = [];
let active: { pos: { x: number; y: number }; color: string }[] = [];
let nCols = 0;
let nRows = 0;
let animId = 0;
let colorIndex = 0;

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

    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    nCols = Math.floor(canvas.width / W);
    nRows = Math.floor(canvas.height / W);

    grid = Array.from({ length: nRows }, () => new Array(nCols).fill(undefined));
    active = [];
    colorIndex = 0;

    shuffledColors = [...COLORS];
    for (let i = shuffledColors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
    }

    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
}

function loop() {
    const stepsPerFrame = Math.min(80, Math.max(25, Math.floor(400 / Math.max(active.length, 1))));
    for (let step = 0; step < stepsPerFrame; step++) {
        if (active.length === 0) return;

        const idx = Math.floor(Math.random() * active.length);
        const { pos, color } = active[idx];
        let found = false;

        for (let n = 0; n < K; n++) {
            const unit = randomUnit();
            const m = R + Math.random() * R;
            const sample = { x: unit.x * m + pos.x, y: unit.y * m + pos.y };

            const col = Math.floor(sample.x / W);
            const row = Math.floor(sample.y / W);

            if (!inBounds(sample.x, sample.y) || col < 0 || row < 0 || col >= nCols || row >= nRows || grid[row][col]) continue;

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
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const color = shuffledColors[colorIndex % shuffledColors.length];
    colorIndex++;

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

// Responsive: redraw on resize
let resizeTimer = 0;
new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(init, 100);
}).observe(canvas.parentElement!);

// Theme-aware: restart when theme changes
new MutationObserver(() => init()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
});

init();
