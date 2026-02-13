# Encontro — Style Palette

Inherited from Ontik's visual language, adapted for multiplayer encounter.

## Core Aesthetic
- **Dark**: Near-black backgrounds. Light is precious and meaningful.
- **Luminous**: All visual interest comes from light emission, not reflection.
- **Cosmic**: Star-like, bioluminescent, ethereal.
- **Warm**: Despite darkness, the feeling should be warm and safe.

## Presence Colors (HSL-Based)

Each presence gets a unique hue, high saturation, medium lightness.
Colors drift slowly over time.

| Name | HSL | Use Case |
|------|-----|----------|
| Warm Glow | `(30, 0.8, 0.6)` | Orange/amber presence |
| Cool Light | `(200, 0.7, 0.65)` | Blue/cyan presence |
| Merge Violet | `(270, 0.6, 0.6)` | Purple merge state |
| Trace Green | `(140, 0.5, 0.5)` | Post-merge trace |
| Deep Rose | `(340, 0.7, 0.55)` | Rose/pink presence |
| Solar Gold | `(45, 0.85, 0.6)` | Golden presence |

## Environment Colors

| Element | Color | Notes |
|---------|-------|-------|
| Background | `#000000` | Pure black |
| Ground base | `rgb(5, 5, 16)` | Near-black with blue tint |
| Ground glow | `rgb(0, 50, 100)` | Bioluminescent blue |
| Sky particles | Mix warm/cool | Subtle star variation |
| Fog | `rgba(10, 15, 30, 0.02-0.05)` | Very subtle depth fog |

## Additive Blending

All presence rendering uses additive blending:
- Overlapping presences create brighter, richer colors
- Merge creates combined palette (not muddy averages)
- Dark background means additive = natural glow

## GLSL Color Patterns (from Ontik)

### Soft Glow Core
```glsl
float glow = exp(-dist * dist * 4.0);
vec3 col = baseColor * glow * brightness;
```

### Breathing Rhythm
```glsl
float breath = 1.0 + 0.1 * sin(time * breathRate * 6.28318);
```

### Gaussian Alpha Falloff
```glsl
float alpha = exp(-r * r / (2.0 * sigma * sigma));
```

### Phase Color Transition
```glsl
vec3 phaseColor = mix(fromColor, toColor, smoothstep(0.0, 1.0, transitionT));
```

## Typography (UI Only)
- Font: Inter (light weight)
- Tracking: wide (letter-spacing)
- Opacity: 0.4-0.8 (never fully opaque)
- Minimal text — the experience speaks through light and sound

## Animation Principles
- Slow, organic movement (no snappy transitions)
- Sinusoidal easing for breathing rhythms
- Long transitions between phases (5 second fades)
- Everything should feel alive, not mechanical
