import { EditorView } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { basicSetup } from "codemirror";

import { getThemeExtensions, onThemeChange } from "../editorThemes.js";
import { createShaderRuntime } from "./shaderRuntime.js";

interface ShaderPlaygroundOptions {
    canvasId: string;
    editorId: string;
    errorId: string;
    resetId: string;
    code: string;
}

export function initShaderPlayground({ canvasId, editorId, errorId, resetId, code }: ShaderPlaygroundOptions) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const editorRoot = document.getElementById(editorId)!;
    const errorBox = document.getElementById(errorId)!;
    const resetBtn = document.getElementById(resetId)!;

    // Compartment allows swapping the theme extension at runtime without rebuilding the editor
    const themeCompartment = new Compartment();

    const runtime = createShaderRuntime(canvas, errorBox, code);

    const editor = new EditorView({
        state: EditorState.create({
            doc: code,
            extensions: [
                basicSetup,
                cpp(), // GLSL syntax is close enough to C++ for reasonable highlighting
                EditorView.lineWrapping,
                themeCompartment.of(getThemeExtensions()),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        runtime.update(editor.state.doc.toString());
                    }
                }),
            ],
        }),
        parent: editorRoot,
    });

    // Reset replaces the entire document content with the original shader code
    resetBtn.addEventListener("click", () => {
        editor.dispatch({
            changes: {
                from: 0,
                to: editor.state.doc.length,
                insert: code,
            },
        });
    });

    // Re-apply the correct theme whenever the site theme toggles
    onThemeChange(() => {
        editor.dispatch({
            effects: themeCompartment.reconfigure(getThemeExtensions()),
        });
    });
}
