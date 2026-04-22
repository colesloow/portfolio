---
title: Moebius Shaders
description: An exploration of non-photorealistic rendering in Unity, inspired by the graphic style of Jean Giraud. Clean line art, flat colors, and hand-drawn hatching are achieved through custom shaders in Unity's URP, replacing the standard lighting pipeline with one built entirely for artistic control.
date: 2026-04-22

thumbnail: ../../assets/images/projects/moebius-shaders/cover.png

tags:
    - Unity
    - Shaders
    - URP
    - Shader Graph
    - HLSL
    - Non-Photorealistic

links:
    github: https://github.com/colesloow/moebius_shaders

---

The starting point was a specific visual question: can a 3D scene feel genuinely hand-drawn, rather than just filtered to look like it? The graphic novels of Jean Giraud set the target: clean, confident outlines, flat color fills, and hatching that suggests shadow without simulating light. The video game Sable, itself directly inspired by Giraud's work, was a concrete example of what that could look like in real-time 3D.

A [video by Useless Game Dev](https://www.youtube.com/watch?v=jlKNOirh66E) exploring a similar approach in Unity was the main technical starting point for this project.

Achieving this required stepping away from physically-based materials and automatic lighting. Objects are rendered unlit, colors are chosen manually rather than computed from a light source, and shadows are drawn as patterns rather than gradients.

The technical side is covered in detail in the [blog series](/blog/moebius-shaders-1).
