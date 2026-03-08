export function createShaderRuntime(canvas, errorBox, initialCode) {
    const gl = canvas.getContext("webgl");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const vertexSrc = `
attribute vec2 position;
void main(){
gl_Position = vec4(position,0.0,1.0);
}
`;

    function showError(msg) {
        errorBox.style.display = "block";
        errorBox.textContent = msg;
    }

    function clearError() {
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }

    function compileShader(type, source) {
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            showError(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    function createProgram(fragment) {
        clearError();

        const vs = compileShader(gl.VERTEX_SHADER, vertexSrc);
        const fs = compileShader(gl.FRAGMENT_SHADER, fragment);

        if (!vs || !fs) return null;

        const program = gl.createProgram();

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

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    function update(fragment) {
        const newProgram = createProgram(fragment);
        if (newProgram) program = newProgram;
    }

    function render(time) {
        if (!program) {
            requestAnimationFrame(render);
            return;
        }

        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.useProgram(program);

        const position = gl.getAttribLocation(program, "position");

        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        const res = gl.getUniformLocation(program, "u_resolution");
        const t = gl.getUniformLocation(program, "u_time");

        if (res) gl.uniform2f(res, canvas.width, canvas.height);
        if (t) gl.uniform1f(t, time * 0.001);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    return { update };
}
