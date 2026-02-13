# Encontro - Claude Development Context

## What This Is
Multiplayer VR encounter ceremony. Users appear as luminous
energy presences in dark space. They can approach, merge, and
separate. Design target: the phenomenology of light MDMA.

## Tech Stack
- WebXR + Three.js + TypeScript + WebSocket multiplayer
- GPU instanced particles for presence rendering
- Web Audio API + Tone.js for spatial/generative audio
- Vite build system, deployed to GitHub Pages (client)
- Node.js + ws for signaling server

## Current Phase
Phase 1: Two Beings in Darkness — Milestone 1.1 (Networked Empty Space)

## Active Branch
claude/setup-ontik-infrastructure-XxpnE

## Key Files
- `client/src/core/app.ts` — main application bootstrap
- `client/src/core/scene.ts` — Three.js scene setup
- `client/src/core/renderer.ts` — WebXR renderer config
- `client/src/ceremony/CeremonyManager.ts` — phase orchestration
- `client/src/ceremony/CeremonyConfig.ts` — per-phase parameters
- `client/src/presence/PresenceRenderer.ts` — particle system (TODO: GPU instanced)
- `client/src/shaders/presence/` — GLSL for luminous beings
- `client/src/network/NetworkManager.ts` — WebSocket connection
- `client/src/network/StateSync.ts` — position interpolation
- `server/src/index.ts` — Express + WebSocket server
- `server/src/CeremonyRoom.ts` — room state management
- `shared/` — types shared between client and server

## Design Constraints
- Quest 2 minimum: 72 Hz, 15K particles total budget
- 2-6 participants per ceremony
- 25-minute ceremony arc (Arrival 3m → Sensing 3m → Approach 5m → Encounter 10m → Release 3m → Reflection 2m)
- No text chat, no usernames, no profiles
- Connection through presence, sound, light only

## Architecture Notes
- Pure Three.js (no React Three Fiber) — direct GPU control needed for particles
- WebSocket server relays presence state at 30 Hz (~200 bytes/update)
- Server is authoritative for ceremony timing; clients interpolate
- Merge detection is client-side; server confirms mutual merge
- All particle rendering is GPU-instanced (single draw call per presence)

## Parent Project: Ontik
- Repo: danrezi-gif/Ontik-vr-shader-experience
- Shared: Vite build system, GLSL infrastructure, TypeScript config, visual aesthetic
- Ontik = solo contemplative journeys; Encontro = multiplayer encounter ceremonies

## Don't
- Add game mechanics, achievements, scores
- Add social features (friends, follows, profiles)
- Add text or chat
- Add React or any UI framework — pure DOM for minimal UI
- Optimize prematurely — get it working, then tune
