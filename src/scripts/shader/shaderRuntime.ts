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
    const glOrNull = canvas.getContext("webgl");

    if (!glOrNull) {
        errorBox.style.display = "block";
        errorBox.textContent = "WebGL not supported.";
        return { update: () => {} };
    }

    // Reassign to a non-nullable const so TypeScript can trust the type in all closures
    const gl = glOrNull;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

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
        const fs = compileShader(gl.FRAGMENT_SHADER, fragment);

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

    let program = createProgram(initialCode);

    // Two triangles forming a full-screen quad, using TRIANGLE_STRIP topology
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Recompiles the fragment shader live; only replaces the active program on success
    function update(fragment: string) {
        const newProgram = createProgram(fragment);
        if (newProgram) program = newProgram;
    }

    function render(time: number) {
        if (!program) {
            requestAnimationFrame(render);
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

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    return { update };
}
