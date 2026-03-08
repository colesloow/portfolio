---
title: Test Article
summary: A fake article used to test typography and layout.
date: 2026-01-01
---

---

# Procedural Noise and Visual Structure

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vel magna sit amet neque tristique luctus. Sed ultricies, purus nec facilisis aliquet, justo arcu convallis ipsum, nec malesuada mauris lorem sit amet nibh.

## Why procedural systems matter

Procedural generation allows artists and engineers to create **complex structures from simple rules**.

Some advantages include:

- scalability
- variation
- reduced asset size
- emergent behaviour

> Procedural techniques are not about randomness.
> They are about structured complexity.

---

## Example image

![Example image](https://picsum.photos/900/500)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum feugiat lacus vel elit luctus, sit amet fermentum nisi consequat.

---

## Mathematical formulation

A simple noise function can be written as:

$$
f(x) = \sum_{i=0}^{n} a_i \sin(f_i x)
$$

More generally:

$E = mc^2$

Where:

- `aᵢ` controls amplitude
- `fᵢ` controls frequency

---

## Code example

```cpp
// Simple GLSL noise example

float hash(vec2 p)
{
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x)
         + (c - a) * u.y * (1.0 - u.x)
         + (d - b) * u.x * u.y;
}
```

---

## Second image

![Another image](https://picsum.photos/800/600)

---

## Table example

| Technique     | Cost   | Visual richness |
| ------------- | ------ | --------------- |
| Perlin noise  | Low    | Medium          |
| Simplex noise | Medium | High            |
| SDF modeling  | Medium | Very high       |

---

## Inline code example

Sometimes you want to reference a function like `noise(vec2 p)` directly inside a paragraph.

---

## Conclusion

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.

Procedural approaches remain one of the most powerful tools in technical art.
