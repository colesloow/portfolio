import { EditorView } from "https://esm.sh/@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "https://esm.sh/@codemirror/language";
import { tags as t } from "https://esm.sh/@lezer/highlight";

const darkTheme = EditorView.theme({
    "&": { backgroundColor: "#1e1f29", color: "#e6e8eb" },
    ".cm-content": { caretColor: "#22d3ee" },
    ".cm-cursor": { borderLeftColor: "#22d3ee" },
    ".cm-gutters": {
        backgroundColor: "#1e1f29",
        color: "#6b7280",
        border: "none",
    },
    ".cm-activeLine": { backgroundColor: "#ffffff08" },
});

const darkHighlight = HighlightStyle.define([
    { tag: t.keyword, color: "#ff79c6" },
    { tag: t.function(t.variableName), color: "#50fa7b" },
    { tag: t.variableName, color: "#8be9fd" },
    { tag: t.number, color: "#bd93f9" },
    { tag: t.string, color: "#f1fa8c" },
    { tag: t.comment, color: "#6272a4", fontStyle: "italic" },
    { tag: t.operator, color: "#ff79c6" },
]);

const lightTheme = EditorView.theme({
    "&": { backgroundColor: "#f8fafc", color: "#111827" },
    ".cm-content": { caretColor: "#0891b2" },
    ".cm-cursor": { borderLeftColor: "#0891b2" },
    ".cm-gutters": {
        backgroundColor: "#f1f5f9",
        color: "#64748b",
        border: "none",
    },
    ".cm-activeLine": { backgroundColor: "#00000008" },
});

const lightHighlight = HighlightStyle.define([
    { tag: t.keyword, color: "#c026d3" },
    { tag: t.function(t.variableName), color: "#059669" },
    { tag: t.variableName, color: "#0284c7" },
    { tag: t.number, color: "#7c3aed" },
    { tag: t.string, color: "#ca8a04" },
    { tag: t.comment, color: "#64748b", fontStyle: "italic" },
    { tag: t.operator, color: "#be123c" },
]);

export function getThemeExtensions() {
    const isLight = document.documentElement.classList.contains("light");

    return isLight ? [lightTheme, syntaxHighlighting(lightHighlight)] : [darkTheme, syntaxHighlighting(darkHighlight)];
}
