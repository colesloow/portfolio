// Settings drawer for the home page canvas.
// Renders a slide-down panel with sliders (stroke width, R) and color swatches.
// The tab at the bottom supports both click-to-toggle and drag-to-open/close.

const STYLE_ID = "canvas-drawer-styles";

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    .canvas-drawer-wrapper {
        position: absolute;
        top: 0;
        left: 50%;
        transition: transform 0.28s ease;
        z-index: 10;
        display: flex;
        flex-direction: column;
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
        cursor: grab;
        touch-action: none;
        user-select: none;
        color: var(--text);
        transition: color 0.15s ease;
    }
    .canvas-drawer-toggle:active { cursor: grabbing; }
    .canvas-drawer-toggle:hover { animation: rainbow-icon 4s linear infinite; }

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
    document.head.appendChild(style);
}

function makeSlider(
    label: string,
    min: number, max: number, step: number, value: number,
    onChange: (v: number) => void
): HTMLElement {
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

export interface DrawerCallbacks {
    onStrokeWidth: (v: number) => void;
    onR: (v: number) => void;
    onColorChange: (index: number, color: string) => void;
}

export function createDrawer(
    parent: HTMLElement,
    state: { strokeWidth: number; R: number; colors: string[] },
    callbacks: DrawerCallbacks
): void {
    injectStyles();
    parent.querySelectorAll(".canvas-drawer-wrapper").forEach((el) => el.remove());

    const wrapper = document.createElement("div");
    wrapper.className = "canvas-drawer-wrapper";

    const drawer = document.createElement("div");
    drawer.className = "canvas-drawer";

    drawer.appendChild(makeSlider("width", 0.5, 6, 0.5, state.strokeWidth, callbacks.onStrokeWidth));

    // Changing R recomputes cell size and margin, then restarts the simulation
    drawer.appendChild(makeSlider("R", 2, 16, 1, state.R, callbacks.onR));

    const divider = document.createElement("hr");
    divider.className = "drawer-divider";
    drawer.appendChild(divider);

    const colorsRow = document.createElement("div");
    colorsRow.className = "drawer-colors";

    state.colors.forEach((color, i) => {
        const swatch = document.createElement("div");
        swatch.className = "canvas-color-swatch";
        swatch.style.background = color;

        const input = document.createElement("input");
        input.type = "color";
        input.value = color;
        input.addEventListener("input", () => {
            swatch.style.background = input.value;
            callbacks.onColorChange(i, input.value);
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

    // --- Open / close ---

    let drawerH = 0;
    let isOpen = false;

    function applyOffset(offset: number, animated: boolean) {
        wrapper.style.transition = animated ? "transform 0.28s ease" : "none";
        wrapper.style.transform = `translateX(-50%) translateY(${offset}px)`;
        isOpen = offset === 0;
    }

    // Measure after mount so offsetHeight is available, then start closed
    requestAnimationFrame(() => {
        drawerH = drawer.offsetHeight;
        applyOffset(-drawerH, false);
    });

    // --- Drag to open / close ---

    let isDragging = false;
    let didDrag = false;
    let pointerStartY = 0;
    let baseOffset = 0;

    toggle.addEventListener("pointerdown", (e) => {
        isDragging = true;
        didDrag = false;
        pointerStartY = e.clientY;
        baseOffset = isOpen ? 0 : -drawerH;
        wrapper.style.transition = "none";
        toggle.setPointerCapture(e.pointerId);
    });

    toggle.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const delta = e.clientY - pointerStartY;
        if (Math.abs(delta) > 4) didDrag = true;
        const clamped = Math.max(-drawerH, Math.min(0, baseOffset + delta));
        wrapper.style.transform = `translateX(-50%) translateY(${clamped}px)`;
    });

    function finishDrag(e: PointerEvent) {
        if (!isDragging) return;
        isDragging = false;
        const delta = e.clientY - pointerStartY;
        const threshold = drawerH * 0.35;
        // Tap: toggle. Drag: snap based on how far past the threshold the user went.
        const targetOpen = didDrag
            ? (isOpen ? delta > -threshold : delta > threshold)
            : !isOpen;
        applyOffset(targetOpen ? 0 : -drawerH, true);
    }

    toggle.addEventListener("pointerup", finishDrag);
    toggle.addEventListener("pointercancel", () => {
        if (!isDragging) return;
        isDragging = false;
        applyOffset(isOpen ? 0 : -drawerH, true);
    });

    document.addEventListener("click", (e) => {
        if (isOpen && !wrapper.contains(e.target as Node)) {
            applyOffset(-drawerH, true);
        }
    });
}
