# coleslow.dev

Personal portfolio built with [Astro](https://astro.build). Covers projects in generative art, shaders, game development, and 3D.

Live at [coleslow.dev](https://coleslow.dev).

---

## Stack

- **Astro** - static site generator with content collections for projects and blog posts
- **TypeScript** - all scripts and interactive components
- **WebGL** - live shader rendering in the browser
- **CodeMirror 6** - code editor for the interactive shader playground
- **MDX** - blog posts with embedded interactive components

---

## Custom components

### ShaderPlayground

An in-browser GLSL editor with live preview. Type GLSL fragment shader code and the result renders in real time in a WebGL canvas next to the editor.

The code editor (CodeMirror 6) supports GLSL syntax highlighting and hot-reloads the shader on every keystroke. A reset button restores the original shader from the article.

Inspired by [The Book of Shaders](https://thebookofshaders.com) and its interactive approach to teaching GLSL.

Two uniforms are available in every shader:
- `uniform float u_time` - elapsed time in seconds
- `uniform vec2 u_resolution` - canvas dimensions in pixels

### ShaderPreview

A read-only variant of ShaderPlayground. Renders a GLSL shader as a live canvas with no editor. Used on project pages to embed a running shader as a visual.

The shader source is imported at build time via Vite's `?raw` loader and inlined into the page.

### CodeBlock

Syntax-highlighted code blocks for articles. Supports collapse/expand for long snippets (above 20 lines). Uses CodeMirror 6 with language-specific parsers (GLSL, TypeScript, C#, HLSL) -- the main reason for using CodeMirror here rather than a lighter library is to share the same custom editor theme as ShaderPlayground.

### Stepper

A step-by-step component for sequenced content in articles. Each step has a title, optional description, and an associated visual (image or canvas). Navigation is handled via CustomEvents, with a mobile-friendly counter fallback.

---

## Content

Projects and blog posts are Astro content collections in `src/content/`. Both support a `draft: true` frontmatter flag to exclude entries from production builds.

Project pages support:
- Cover image and gallery
- Tags
- GitHub link with a prominent CTA block
- Body text (MDX) rendered before the gallery
- Embedded ShaderPreview or ShaderPlayground components

---

## Home canvas

The home page canvas (`src/scripts/homeCanvas.ts`) runs an interactive Poisson disc sampling simulation. Clicking plants 5 seed points in a cross pattern, all sharing the same color. Each seed spawns children that inherit its color and are connected by a visible line, producing a colored spanning tree that gradually fills the canvas. Right-click resets.

A small settings drawer (accessible via a toggle at the top) exposes sliders for line width and minimum point spacing (R), plus color swatches to customize the palette. The canvas background color is read from the active CSS theme and updates automatically on light/dark mode switch.

---

## Commands

| Command             | Action                                    |
| :------------------ | :---------------------------------------- |
| `npm install`       | Install dependencies                      |
| `npm run dev`       | Start local dev server at localhost:4321  |
| `npm run build`     | Build to ./dist                           |
| `npm run preview`   | Preview the production build locally      |
