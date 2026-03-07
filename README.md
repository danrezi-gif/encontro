# encontro

A WebXR ceremony of encounter — where you become a field of light.

## What is this

Encontro is an immersive VR experience built for the Meta Quest. There are no avatars, no usernames, no profiles. When you enter, you become a flowing field of iridescent energy — prismatic light that breathes, moves, and responds to your body.

Move your arms and ripples of light trail behind them. Stand still and the field contracts, breathing slowly. Move fast and it scatters into warm, bright fragments.

In future phases, other users appear as their own energy fields. When two fields drift close enough, they begin to merge — iridescent liquid light flowing between them. That's the encounter.

## Architecture

- **Client**: Three.js + custom GLSL shaders, served via Vite
- **Rendering**: WebXR immersive-vr with hand tracking (no visible hands or controllers)
- **Presence**: Two layered shader systems — raymarched iridescent volume (inner core) and flowing bokeh gradient orbs (outer aura)
- **Server**: Node.js with Socket.IO for real-time multi-user state (future)

## Development

```bash
npm install
npm run dev
```

Open in a browser for desktop preview, or connect a Quest headset and click "enter vr".

## Phases

- **Phase 0**: Landing page, signal canvas (deactivated)
- **Phase 1**: Energy field presence — you are light *(current)*
- **Phase 2**: AI energy fields that drift and merge
- **Phase 3**: Networked multi-user encounters
