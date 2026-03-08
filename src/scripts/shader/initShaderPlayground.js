import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { EditorState, Compartment } from "https://esm.sh/@codemirror/state";
import { cpp } from "https://esm.sh/@codemirror/lang-cpp";

import { getThemeExtensions } from "./editorThemes.js";
import { createShaderRuntime } from "./shaderRuntime.js";

export function initShaderPlayground({ canvasId, editorId, errorId, resetId, code }) {
    const canvas = document.getElementById(canvasId);
    const editorRoot = document.getElementById(editorId);
    const errorBox = document.getElementById(errorId);
    const resetBtn = document.getElementById(resetId);

    const themeCompartment = new Compartment();

    const runtime = createShaderRuntime(canvas, errorBox, code);

    const editor = new EditorView({
        state: EditorState.create({
            doc: code,
            extensions: [
                basicSetup,
                cpp(),
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

    resetBtn.addEventListener("click", () => {
        editor.dispatch({
            changes: {
                from: 0,
                to: editor.state.doc.length,
                insert: code,
            },
        });
    });

    const observer = new MutationObserver(() => {
        editor.dispatch({
            effects: themeCompartment.reconfigure(getThemeExtensions()),
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
    });
}
