const canvas = document.getElementById("home-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const COLORS = ["#6050dc", "#ffd800", "#ff4f00", "#0081f7", "#9ed8ff", "#ffc4ed"];
let shuffledColors = [...COLORS];

let R = 5;
let K = 30;
let W = R / Math.sqrt(2);
let MARGIN = R * 1.3;
let strokeWidth = 2;

let grid: ({ x: number; y: number } | undefined)[][] = [];
let active: { pos: { x: number; y: number }; color: string }[] = [];
let nCols = 0;
let nRows = 0;
let animId = 0;
let colorIndex = 0;

// --- Shared styles ---

const sharedStyle = document.createElement("style");
sharedStyle.textContent = `
    @keyframes canvas-ripple {
        0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
        100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
    }

    .canvas-drawer-wrapper {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) translateY(var(--drawer-offset, -200px));
        transition: transform 0.28s ease;
        z-index: 10;
        display: flex;
        flex-direction: column;
    }
    .canvas-drawer-wrapper.open {
        transform: translateX(-50%) translateY(0);
    }

    .canvas-drawer {
        background: var(--surface);
        border: 1px solid var(--border);
        border-top: none;
        border-bottom: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        padding: 14px 18px 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 240px;
        font-size: 12px;
        color: var(--text);
        user-select: none;
    }

    .canvas-drawer-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 28px;
        padding: 0 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-top: none;
        border-radius: 0 0 8px 8px;
        cursor: pointer;
        user-select: none;
        color: var(--text);
        transition: color 0.15s ease;
    }
    .canvas-drawer-toggle:hover { color: var(--accent); }
    .canvas-drawer-toggle:active { transform: scale(0.97); }
    .canvas-drawer .drawer-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .canvas-drawer .drawer-row span {
        width: 36px;
        color: var(--text-muted);
        flex-shrink: 0;
    }
    .canvas-drawer input[type=range] {
        flex: 1;
        accent-color: var(--accent);
        cursor: pointer;
    }
    .canvas-drawer .val {
        width: 28px;
        text-align: right;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
    }
    .canvas-drawer .drawer-divider {
        border: none;
        border-top: 1px solid var(--border);
        margin: 2px 0;
    }
    .canvas-drawer .drawer-colors {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
    }
    .canvas-color-swatch {
        position: relative;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color 0.15s, transform 0.15s;
        flex-shrink: 0;
    }
    .canvas-color-swatch:hover { border-color: var(--text-muted); transform: scale(1.15); }
    .canvas-color-swatch input[type=color] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
        border: none;
        padding: 0;
    }
`;
document.head.appendChild(sharedStyle);

(canvas.parentElement as HTMLElement).style.position = "relative";

// --- Hint ripple ---

let hintActive = true;
let hintTimeout = 0;

function spawnHintRipple() {
    if (!hintActive) return;

    const parent = canvas.parentElement!;
    parent.querySelectorAll(".canvas-hint").forEach((el) => el.remove());

    const x = MARGIN + Math.random() * (canvas.width - 2 * MARGIN);
    const y = MARGIN + Math.random() * (canvas.height - 2 * MARGIN);

    const scaleX = canvas.clientWidth / canvas.width;
    const scaleY = canvas.clientHeight / canvas.height;

    const wrapper = document.createElement("div");
    wrapper.className = "canvas-hint";
    wrapper.style.cssText = `position:absolute;left:${x * scaleX}px;top:${y * scaleY}px;width:0;height:0;pointer-events:none;`;

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
    const parent = canvas.parentElement!;
    parent.querySelectorAll(".canvas-drawer-wrapper").forEach((el) => el.remove());

    const wrapper = document.createElement("div");
    wrapper.className = "canvas-drawer-wrapper";

    const drawer = document.createElement("div");
    drawer.className = "canvas-drawer";

    function makeSlider(label: string, min: number, max: number, step: number, value: number, onChange: (v: number) => void) {
        const row = document.createElement("div");
        row.className = "drawer-row";

        const name = document.createElement("span");
        name.textContent = label;

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = String(min);
        slider.max = String(max);
        slider.step = String(step);
        slider.value = String(value);

        const val = document.createElement("span");
        val.className = "val";
        val.textContent = String(value);

        slider.addEventListener("input", () => {
            const v = parseFloat(slider.value);
            val.textContent = String(v);
            onChange(v);
        });

        row.appendChild(name);
        row.appendChild(slider);
        row.appendChild(val);
        return row;
    }

    drawer.appendChild(makeSlider("width", 0.5, 6, 0.5, strokeWidth, (v) => {
        strokeWidth = v;
        ctx.lineWidth = strokeWidth;
    }));

    drawer.appendChild(makeSlider("R", 2, 16, 1, R, (v) => {
        R = v;
        W = R / Math.sqrt(2);
        MARGIN = R * 1.3;
        init();
    }));

    const divider = document.createElement("hr");
    divider.className = "drawer-divider";
    drawer.appendChild(divider);

    const colorsRow = document.createElement("div");
    colorsRow.className = "drawer-colors";

    COLORS.forEach((color, i) => {
        const swatch = document.createElement("div");
        swatch.className = "canvas-color-swatch";
        swatch.style.background = color;

        const input = document.createElement("input");
        input.type = "color";
        input.value = color;
        input.addEventListener("input", () => {
            COLORS[i] = input.value;
            swatch.style.background = input.value;
            shuffledColors = [...COLORS];
        });

        swatch.appendChild(input);
        colorsRow.appendChild(swatch);
    });

    drawer.appendChild(colorsRow);

    const toggle = document.createElement("div");
    toggle.className = "canvas-drawer-toggle";
    toggle.innerHTML = `<svg width="16" height="12" viewBox="-1 -1 16 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="0" y1="2" x2="14" y2="2"/><circle cx="10" cy="2" r="2" fill="var(--surface)"/><line x1="0" y1="8" x2="14" y2="8"/><circle cx="4" cy="8" r="2" fill="var(--surface)"/></svg>`;

    wrapper.appendChild(drawer);
    wrapper.appendChild(toggle);
    parent.appendChild(wrapper);

    // Measure drawer height after mount to set initial offset
    requestAnimationFrame(() => {
        const drawerH = drawer.offsetHeight;
        wrapper.style.setProperty("--drawer-offset", `-${drawerH}px`);
    });

    toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        wrapper.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target as Node)) {
            wrapper.classList.remove("open");
        }
    });
}

// --- Poisson disk sampling ---

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
    ctx.lineWidth = strokeWidth;

    if (hintActive) hintTimeout = window.setTimeout(spawnHintRipple, 1500);
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

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    init();
});

// Responsive: redraw on resize
let resizeTimer = 0;
new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { init(); createControls(); }, 100);
}).observe(canvas.parentElement!);

// Theme-aware: restart when theme changes
new MutationObserver(() => { init(); }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
});

init();
createControls();
