// Creates and manages a WebGL render loop for a single fragment shader.
// The vertex shader draws a full-screen quad; only the fragment shader is user-editable.
// Exposed uniforms available to fragment shaders:
//   u_resolution : vec2  - canvas dimensions in pixels
//   u_time       : float - elapsed time in seconds

export function createShaderRuntime(
    canvas: HTMLCanvasElement,
    errorBox: HTMLElement,
    initialCode: string
): { update: (fragment: string) => void } {
    // Try standard webgl, fall back to experimental-webgl for older mobile browsers.
    // antialias: false reduces GPU memory usage and improves compatibility on mobile.
    const ctxOptions: WebGLContextAttributes = { antialias: false, alpha: true };
    const glOrNull = (
        canvas.getContext("webgl", ctxOptions) ||
        canvas.getContext("experimental-webgl", ctxOptions)
    ) as WebGLRenderingContext | null;

    if (!glOrNull) {
        errorBox.style.display = "block";
        errorBox.textContent = "WebGL not supported.";
        return { update: () => {} };
    }

    // Reassign to a non-nullable const so TypeScript can trust the type in all closures
    const gl = glOrNull;

    canvas.width = canvas.clientWidth || canvas.offsetWidth || 300;
    canvas.height = canvas.clientHeight || canvas.offsetHeight || 400;

    // Minimal pass-through vertex shader: maps [-1,1] clip space to screen
    const vertexSrc = `
attribute vec2 position;
void main(){
gl_Position = vec4(position,0.0,1.0);
}
`;

    function showError(msg: string | null) {
        errorBox.style.display = "block";
        errorBox.textContent = msg ?? "";
    }

    function clearError() {
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }

    // On mobile GPUs, mediump float has only 10 bits of mantissa.
    // Hash functions like fract(sin(p) * 43758.5) lose all randomness at mediump because
    // the large multiplier exceeds meaningful precision. Replace mediump declarations with
    // a guard that uses highp where the device supports it.
    function normalizePrecision(src: string): string {
        const guard =
            '#ifdef GL_FRAGMENT_PRECISION_HIGH\n' +
            'precision highp float;\n' +
            'precision highp int;\n' +
            '#else\n' +
            'precision mediump float;\n' +
            'precision mediump int;\n' +
            '#endif\n';
        return src.replace(/precision\s+mediump\s+float\s*;(\s*precision\s+mediump\s+int\s*;)?/g, guard);
    }

    function compileShader(type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            showError(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    function createProgram(fragment: string): WebGLProgram | null {
        clearError();

        const vs = compileShader(gl.VERTEX_SHADER, vertexSrc);
        const fs = compileShader(gl.FRAGMENT_SHADER, normalizePrecision(fragment));

        if (!vs || !fs) return null;

        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            showError(gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    // Track current fragment so the context can be fully rebuilt after a context restore
    let currentFragment = initialCode;
    let program = createProgram(currentFragment);
    let animFrameId: number | null = null;

    function setupBuffers() {
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }

    setupBuffers();

    // Mobile browsers (and some desktop ones) can lose the WebGL context when the
    // tab goes to background, memory is under pressure, or the GPU resets.
    // Calling preventDefault() on contextlost signals that we want the browser to
    // restore it. We rebuild all GPU state (program + buffers) on contextrestored.
    canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }, false);

    canvas.addEventListener("webglcontextrestored", () => {
        setupBuffers();
        program = createProgram(currentFragment);
        animFrameId = requestAnimationFrame(render);
    }, false);

    function render(time: number) {
        // Stop the loop if the context was lost; it will be restarted on contextrestored
        if (gl.isContextLost()) {
            animFrameId = null;
            return;
        }

        if (!program) {
            animFrameId = requestAnimationFrame(render);
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.useProgram(program);

        const position = gl.getAttribLocation(program, "position");

        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        // Feed standard uniforms; shaders may ignore them if unused
        const res = gl.getUniformLocation(program, "u_resolution");
        const t = gl.getUniformLocation(program, "u_time");

        if (res) gl.uniform2f(res, canvas.width, canvas.height);
        if (t) gl.uniform1f(t, time * 0.001); // convert ms to seconds

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        animFrameId = requestAnimationFrame(render);
    }

    animFrameId = requestAnimationFrame(render);

    // Recompiles the fragment shader live; only replaces the active program on success
    function update(fragment: string) {
        currentFragment = fragment;
        const newProgram = createProgram(fragment);
        if (newProgram) program = newProgram;
    }

    return { update };
}
