---
title: Moebius Shaders in Unity
date: 2025-01-01
summary: Building a real-time non-photorealistic renderer in Unity URP, inspired by the graphic novel style of Jean Giraud.
draft: true
---

<!--
ARTICLE PLAN - working notes, not final content
Audience: reader who already knows shaders, no need to explain what a fragment shader is
Tone: technical but direct, explain formulas and design choices
-->

## Inspirations and goals

<!--
- Jean Giraud / Moebius: the visual style target - clean outlines, flat color fills, hatching
  for shadow. Not a post-filter; the entire render pipeline is built for this.
- The game Sable as a real-time reference (directly inspired by Giraud)
- The Useless Game Dev video as the main technical starting point
- Goal: NPR in Unity URP. All shaders are UNLIT - no PBR. Lighting is computed manually.
  Colors are chosen by the artist, not derived from light bounces.
- This is an experimental project. Known limitations: aliasing on outlines,
  discrepancies between edit and game view, inconsistencies between materials.
- IMAGE: a Moebius panel from the repo (Assets/Images/moebius.webp)
- IMAGE: a Sable screenshot from the repo (Assets/Images/sable_game.jpg or sable01.webp)
- IMAGE: a final Unity screenshot from the repo (screenshot1 or screenshot4)
-->

## Architecture: screen space and unlit rendering

<!--
- Two layers of rendering:
  1. Object shaders (ColorGradient, Hatching, Bubble, Skydome): all UNLIT, compute lighting
     manually using NdotL and shadow attenuation (ShadowAtten.hlsl)
  2. Fullscreen post-process passes (Outlines): run after the scene is rendered,
     sample the depth, normal, and color buffers to add effects on top
- Briefly explain the depth and normal buffers that URP exposes
- Mention the TimeOfDay system: a C# script (TimeOfDayController.cs) that cycles through
  4 phases (Dawn, Day, Dusk, Night) and sends a TOD_Tint color to all shaders as a global
  property. Every shader has a TOD_Tint input that tints the final output.
  This is how all materials shift together when the time of day changes.
- This section sets the stage for everything that follows
-->

## Outline

<!--
TECHNICAL DETAILS (from Outlines.hlsl + SG_Outlines.shadergraph):

Three edge detection methods, combined in the fullscreen pass:

1. DEPTH-BASED (DepthBasedOutlines_float):
   - Samples the scene depth buffer at the current pixel and its 8 neighbors
   - Applies Scharr operators (X and Y kernels) to compute the depth gradient magnitude
   - Scharr weights: [[-3,0,3],[-10,0,10],[-3,0,3]] for X, transposed for Y
   - If gradient > 0.05, the pixel is an edge
   - Detects: silhouettes, sharp geometric edges

2. NORMAL-BASED (NormalBasedOutlines_float):
   - Samples the scene normal buffer at neighbors
   - Computes dot product of neighboring normals to detect angular discontinuities
   - Threshold: 0.2
   - Detects: surface detail, creases, folds

3. COLOR-BASED (ColorBasedOutlinesFromSamples_float):
   - Uses LRUD subgraph to sample Left, Right, Up, Down neighbors
   - Detects luminance contrast across those 4 samples
   - Uses smoothstep for anti-aliasing on the edge
   - Works on transparent objects too (extension of the tutorial approach)

Helper: SG_Luma() - converts RGB to perceptual brightness
  using ITU-R BT.709 weights: (0.2126, 0.7152, 0.0722)

Shader properties: OutlinesThickness (default 1.0), OutlinesColor (default black),
OutlinesThreshold (default 1.0), NoiseScale (default 150.0)

Resolution-aware: PixelSize subgraph computes 1-pixel UV offset as Thickness / screen size,
  so outlines stay consistent across resolutions.

LRUD subgraph: samples scene color at L/R/U/D offsets from current pixel.
  Used both for color-based outlines and by the hatching shader.

PLAN FOR THE SECTION:
- Explain the fullscreen post-process approach: why do outlines in screen space
  rather than inverted hull or geometry-based?
- Walk through the three detection methods, explain what each one catches
- Show the Scharr kernel matrix and explain the gradient magnitude calculation
- GLSL live: simple SDF scene (a sphere + a box) with a depth edge detection pass
  to let the reader see the threshold slider in action
- IMAGE: before/after Unity screenshot showing outlines on/off
- CODE: the DepthBasedOutlines_float function from Outlines.hlsl
- Mention the LRUD + PixelSize subgraph structure
- Limitations: aliasing on thin lines, depth-based edges can miss grazing surfaces
-->

## Hatching

<!--
TECHNICAL DETAILS (from SG_Hatching.shadergraph):

- The hatching is a fullscreen post-process pass (like outlines), applied in screen space
- Uses T_HatchesTileable.png: a tileable texture of hand-drawn hatch lines
- The key idea: brightness of the underlying scene controls how much hatching to show.
  Dark areas -> dense hatching. Bright areas -> no hatching.
- Uses the Luma subgraph and StepIndexFromLuma subgraph:
  StepIndexFromLuma takes the pixel's luminance and three thresholds (T0, T1, T2)
  and outputs a discrete index (0, 1, 2, 3) - quantizing the shadow into steps.
  Each step maps to a different level of hatch visibility.
- Shader properties include: Vertical, StepEdgeWidth, HatchColor
  "Vertical" likely rotates the hatch direction for different stylistic choices
- URP SampleBuffer nodes used to read the rendered scene into the shader
- Uses double precision for accuracy

PLAN FOR THE SECTION:
- Explain the core idea: hatching is tied to brightness, not to a light direction directly.
  The scene is already rendered (unlit + shadow attenuation), so the hatching just reads
  how dark each pixel is and overlays the texture accordingly.
- Explain the StepIndexFromLuma logic: threshold quantization, why discrete steps
  rather than a smooth blend (it is what gives the hand-drawn look)
- Show the T_HatchesTileable texture and explain the tileable UV approach in screen space
- IMAGE: close-up screenshots comparing hatching density in lit vs shadowed areas
- IMAGE: the T_HatchesTileable.png texture itself
- CODE: StepIndexFromLuma subgraph logic (simple, worth showing)
- Known limitation: screen-space hatching "swims" when the camera moves
  (the hatching pattern does not track the geometry, it is fixed to the screen)
-->

## Color gradient

<!--
TECHNICAL DETAILS (from SG_ColorGradient.shadergraph):

- This is the base object shader, applied to all solid geometry
  (separate material instances for buildings, objects, sand, stones)
- UNLIT: no PBR. Lighting is computed manually using NdotL + ShadowAtten.hlsl
  (MainLightShadowAttenuation_float - returns 0 in shadow, 1 in light)
- Properties: ShadowTint (color), LightTint (vec4), LightThreshold (0-1),
  DissolveAmount (0-1), TOD_Tint
- LightThreshold: above this NdotL value -> LightTint color. Below -> ShadowTint color.
  This is the cel-shading step: instead of a smooth gradient, a hard cutoff.
- Triplanar noise projection: used to break up the silhouette / add texture variation
  in world space without requiring UVs
- DissolveAmount: dissolve mask for fade effects
- Multiple material instances (Buildings, Objects, Sand, Stones) allow
  different color palettes per surface type

PLAN FOR THE SECTION:
- Explain why all shaders are unlit and why that is the right choice for NPR:
  PBR gives physically accurate color variation; we do not want that.
  We want the artist to define the two colors of each surface.
- Walk through the manual lighting calculation: NdotL + shadow attenuation
- Explain the LightThreshold as a hard step: this is the cel-shading mechanism
- Note the multiple material instances and how they enable per-surface color palettes
- GLSL live: a sphere with manual NdotL shading + a step() cutoff to show the difference
  between smooth and stepped shading
- IMAGE: side-by-side of the same mesh with different ShadowTint/LightTint values
- CODE: the ShadowAtten.hlsl function (short, worth showing in full)
-->

## Bubble

<!--
TECHNICAL DETAILS (from SG_Bubble.shadergraph):

- Applied to water/transparent surfaces (MAT_Bubble.mat, MAT_Water.mat)
- URP unlit with alpha blending
- Three visual components:
  1. SPECULAR: dot product of view and light direction, raised to SpecPower,
     multiplied by SpecIntensity. Step-based (not smooth) for the stylized look.
  2. FRESNEL: rim effect using 1 - dot(normal, viewDir), raised to FresnelPower,
     multiplied by FresnelIntensity + FresnelColor tint
  3. BASE COLOR + OPACITY: BaseColor with BubbleOpacity for transparency
- TOD_Tint overlay for time-of-day integration
- Properties: BaseColor, SpecColor, FresnelColor, SpecIntensity, SpecPower,
  FresnelIntensity, FresnelPower, BubbleOpacity, TOD_Tint

PLAN FOR THE SECTION:
- Explain why bubble/water needs its own shader rather than ColorGradient:
  transparency, specular highlights, Fresnel rim
- Walk through the Fresnel formula: what it is, why it looks right for water/glass
- Explain the step-based specular vs smooth specular: same NPR logic as the rest
- GLSL live: a sphere showing Fresnel + step specular with controllable parameters
- IMAGE: close-up screenshot of water/bubble surface in the scene
- CODE: the specular and Fresnel subgraph logic
-->

## Skybox

<!--
TECHNICAL DETAILS (from SG_Skydome.shadergraph):

- Not a standard Unity skybox (which would be a cubemap and look PBR).
  Instead a mesh (dome or sphere) with this custom shader.
- Two main visual components:
  1. CLOUDS: procedural cloud generation using Gradient Noise nodes,
     controlled by cloud threshold, frequency, and detail parameters
  2. GRADIENT: vertical color gradient for the sky color, controlled by
     gradient offset and stretch
- Seam correction: a dedicated node group handles UV seam fixes for
  the sphere/dome mesh
- TOD_Tint: shifts the sky color with time of day (like all other shaders)
- 14 properties, 80+ nodes, double precision

PLAN FOR THE SECTION:
- Explain the choice of a dome mesh over a standard Unity skybox:
  full control over shading, no cubemap, integrates with the TOD system
- Walk through the gradient sky: simple but important for the mood
- Explain the procedural cloud approach with gradient noise:
  how threshold and frequency control cloud density and shape
- Explain seam correction and why it is needed on a sphere
- IMAGE: screenshots of the sky at different times of day
- IMAGE: close-up of the clouds
- CODE: the gradient noise cloud generation logic
-->

## Time of day

<!--
TECHNICAL DETAILS (from TimeOfDayController.cs):

- C# script that runs a 0-1 normalized time value over a configurable day length (default 300s)
- 4 phases: Dawn, Day, Dusk, Night - each with customizable transition points and colors
- Sends a TOD_Tint global shader property every frame
- Also controls: global light color, skydome top/bottom gradient colors
- Eval4() interpolates between the 4 phase colors
- LerpTWrap() handles the Night -> Dawn wrap-around at 0/1 boundary
- Sun rotation: rotates the main directional light over the full cycle

PLAN FOR THE SECTION:
- Could be a short section or a sidebar, not necessarily as long as the shader sections
- Explain the global shader property mechanism: one C# write, all shaders read it
- Show how the TOD_Tint integrates into each shader (it is just a multiply on the final output)
- IMAGE: side-by-side of the same scene at dawn, day, dusk, night
-->

## Results and limitations

<!--
- Several screenshots from the repo: screenshot1 through screenshot5
- Recap known limitations:
  - Aliasing on thin outlines (especially at edges and motion)
  - Discrepancies between Unity Edit mode and Game mode
  - Visual inconsistencies between different material instances at their boundaries
  - Screen-space hatching swimming on camera movement
- What would be the next steps if the project continued:
  - Geometry-aligned hatching to fix the swimming issue
  - Better anti-aliasing on outlines (temporal smoothing, MSAA integration)
  - More material variety (currently 4 ColorGradient variants)
- IMAGE: multiple final scene screenshots (screenshot1 to screenshot5 from the repo)
-->
