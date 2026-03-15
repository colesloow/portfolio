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

Syntax-highlighted code blocks for articles. Supports collapse/expand for long snippets (above 20 lines). Uses CodeMirror 6 with language-specific parsers (GLSL, TypeScript, C#, HLSL).

### Stepper

A step-by-step component for sequenced content in articles. Each step has a title, optional description, and an associated visual (image or canvas). Navigation is handled via CustomEvents, with a mobile-friendly counter fallback.

### PoissonStepper

An extension of Stepper for animated sequences driven by a Poisson disc sampling simulation. The full simulation runs upfront on mount using a seeded RNG (mulberry32), then each frame is drawn on demand as the user steps through.

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

The home page background is a generative canvas (`src/scripts/homeCanvas.ts`) running a cellular automaton. Colors are inherited from the active CSS theme and update automatically when the user switches between light and dark mode.

---

## Commands

| Command             | Action                                    |
| :------------------ | :---------------------------------------- |
| `npm install`       | Install dependencies                      |
| `npm run dev`       | Start local dev server at localhost:4321  |
| `npm run build`     | Build to ./dist                           |
| `npm run preview`   | Preview the production build locally      |
