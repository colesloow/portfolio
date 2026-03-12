// Raymarched metaballs with Blinn-Phong shading.
// Sixteen spheres animate independently through a bounded volume. Their
// surfaces are merged using a smooth-minimum SDF union, which causes nearby
// spheres to blend together rather than intersect with hard edges.
// The scene has no geometry buffers: every pixel casts a ray and steps forward
// until it either hits the implicit surface or exits the bounding distance.

#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

uniform vec2  u_resolution;
uniform float u_time;

// ------------------------------------------------------------------
// Tunable constants
// ------------------------------------------------------------------

// Three colors, randomly assigned to each sphere at startup.
const vec3 BUBBLE_COLOR_A = vec3(0.95, 0.10, 0.60);
const vec3 BUBBLE_COLOR_B = vec3(0.55, 0.20, 1.00);
const vec3 BUBBLE_COLOR_C = vec3(0.20, 0.55, 1.00);

const float BUBBLE_ALPHA    = 0.7;  // unused in final output but kept for reference
const float VELOCITY        = 0.5;  // global animation speed multiplier
const float SMOOTH_K        = 1.5;  // blending radius for smooth union
const float ISO_OFFSET      = 0.0;  // surface threshold offset (0 = exact sphere surface)
const float SPHERE_RADIUS   = 3.5;  // orbit radius: how far spheres stray from origin
const float MIN_RADIUS_FRAC = 0.6;  // minimum orbit fraction (keeps spheres from bunching at center)

// Raymarcher limits
const float MAX_DIST  = 20.0; // ray is discarded beyond this depth
const float EPSILON   = 0.0005;
const int   MAX_STEPS = 96;

// Blinn-Phong lighting
const float AMBIENT        = 0.4;
const vec3  SPEC_COLOR     = vec3(0.7, 0.7, 1.0);
const float SPEC_INTENSITY = 0.7;
const float SHININESS      = 60.0;

// ------------------------------------------------------------------

// Carries distance, color, and world-space hit position through the SDF pipeline.
struct SdfHit {
    float d;
    vec3  col;
    vec3  pos;
};

float saturate(float x) { return clamp(x, 0.0, 1.0); }
vec3  saturate3(vec3 v)  { return clamp(v, 0.0, 1.0); }

// Simple hash: maps a float to [0,1) pseudo-randomly.
float hash11(float x) {
    return fract(sin(x * 127.1) * 43758.5453);
}

// Exact signed distance to a sphere of radius s centered at the origin.
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

// Smooth union of two SdfHit values. Within the blending zone (radius k),
// surfaces are mixed so they merge smoothly instead of intersecting sharply.
// Color is interpolated proportionally to the same blend weight.
SdfHit opSmoothUnionCol(SdfHit a, SdfHit b, float k) {
    float h = saturate(0.5 + 0.5 * (b.d - a.d) / k);

    SdfHit o;
    o.d   = mix(b.d, a.d, h) - k * h * (1.0 - h);
    o.col = mix(b.col, a.col, h);
    o.pos = (h > 0.5) ? a.pos : b.pos;
    return o;
}

// Deterministically assign one of the three palette colors to sphere i.
vec3 bubblePalette(int i) {
    float r = hash11(float(i) * 17.0);
    if (r < 0.333333) return BUBBLE_COLOR_A;
    else if (r < 0.666666) return BUBBLE_COLOR_B;
    else return BUBBLE_COLOR_C;
}

// Compute the world-space center of sphere i at time tB.
// Each axis is driven by a sine wave with a unique frequency derived from the
// sphere's index, so no two spheres follow the same path.
// The orbit radius also oscillates over time, keeping spheres at least
// MIN_RADIUS_FRAC * SPHERE_RADIUS from the origin.
vec3 bubbleCenter(int i, float tB) {
    float fi   = float(i);
    float seed = fract(fi * 412.531 + 0.513);

    // Per-sphere frequencies on each axis
    float w1 = 1.3 + hash11(seed * 17.1) * 2.0;
    float w2 = 1.7 + hash11(seed * 27.3) * 2.0;
    float w3 = 2.1 + hash11(seed * 37.7) * 2.0;

    vec3 dir = vec3(
        sin(tB * w1 + fi * 2.1),
        sin(tB * w2 + fi * 3.7),
        sin(tB * w3 + fi * 5.3)
    );
    dir = normalize(dir + 1e-3); // guard against near-zero direction

    // Oscillating orbit distance, clamped to [MIN_RADIUS_FRAC, 1] * SPHERE_RADIUS
    float wr   = 1.1 + hash11(seed * 91.7) * 3.0;
    float r01  = 0.5 + 0.5 * sin(tB * wr + fi * 4.2);
    float fracMin = saturate(MIN_RADIUS_FRAC);
    float fracR   = mix(fracMin, 1.0, r01);
    float r       = SPHERE_RADIUS * fracR;

    return dir * r;
}

// Evaluate the SDF for the whole scene at point p.
// All 16 spheres are folded into a single SdfHit via repeated smooth union.
SdfHit mapSceneSDF(vec3 p, float tB) {
    SdfHit acc;
    acc.d   = 1e9;
    acc.col = vec3(0.0);
    acc.pos = p;

    for (int i = 0; i < 16; i++) {
        vec3  c      = bubbleCenter(i, tB);
        float fi     = float(i);
        // Individual sphere radius varies per index
        float radius = mix(0.5, 1.0, fract(fi * 412.531 + 0.5124));

        SdfHit s;
        s.pos = p;
        s.d   = sdSphere(p - c, radius);
        s.col = bubblePalette(i);

        acc = opSmoothUnionCol(acc, s, SMOOTH_K);
    }

    return acc;
}

// Tetrahedron-based normal estimation (4 SDF samples instead of 6).
// The tetrahedral sample offsets are orthogonal, giving a correct gradient
// approximation with fewer evaluations than the central-difference method.
vec3 calcNormal(vec3 p, float tB) {
    const float h = 1e-4;

    vec3 kx = vec3( 1.0, -1.0, -1.0);
    vec3 ky = vec3(-1.0,  1.0, -1.0);
    vec3 kz = vec3(-1.0, -1.0,  1.0);
    vec3 kw = vec3( 1.0,  1.0,  1.0);

    vec3 n =
        kx * mapSceneSDF(p + kx * h, tB).d +
        ky * mapSceneSDF(p + ky * h, tB).d +
        kz * mapSceneSDF(p + kz * h, tB).d +
        kw * mapSceneSDF(p + kw * h, tB).d;

    return normalize(n);
}

// Sphere-tracing loop. Steps the ray forward by the SDF value at each point,
// which is safe because the SDF guarantees no surface can be closer than that
// distance. Returns true on hit, false if the ray exits the scene.
bool raymarchScene(vec3 ro, vec3 rd, float tB, out SdfHit hit) {
    float depth = 0.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 pos  = ro + rd * depth;
        SdfHit s  = mapSceneSDF(pos, tB);
        float dist = s.d - ISO_OFFSET;
        depth += dist;

        if (dist < EPSILON) {
            hit = s;
            hit.pos = pos;
            return true;
        }
        if (depth > MAX_DIST) break;
    }

    hit.d   = 1e9;
    hit.pos = ro;
    hit.col = vec3(0.0);
    return false;
}

// Blinn-Phong model: single directional light from the top-right-front direction.
// Specular highlights use the half-vector H = normalize(L + V).
vec3 shadeBlinnPhong(vec3 N, vec3 V, vec3 albedo, out float outAlpha) {
    vec3 L = normalize(vec3(0.577, 0.577, 0.577));
    vec3 H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);

    vec3 ambient  = AMBIENT * albedo;
    vec3 diffuse  = albedo * NdotL;
    // step(0, NdotL) prevents specular from appearing on the shadow side
    vec3 specular = SPEC_COLOR * (pow(NdotH, SHININESS) * SPEC_INTENSITY)
                    * step(0.0, NdotL);

    outAlpha = saturate(BUBBLE_ALPHA);
    return ambient + diffuse + specular;
}

void main() {
    float tB = u_time * VELOCITY;

    // Map fragment coordinates to [-aspect, aspect] x [-1, 1] view space
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    // Camera sits at z=16, looking toward the origin along -z
    vec3 ro = vec3(0.0, 0.0, 16.0);
    vec3 rd = normalize(vec3(uv, -1.6));

    SdfHit hit;
    bool ok = raymarchScene(ro, rd, tB, hit);

    // No hit: fully transparent so the page background shows through
    if (!ok) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    vec3 N = calcNormal(hit.pos, tB);
    vec3 V = normalize(ro - hit.pos);
    vec3 albedo = saturate3(hit.col);

    float alpha;
    vec3 color = shadeBlinnPhong(N, V, albedo, alpha);

    gl_FragColor = vec4(color, 1.0);
}
