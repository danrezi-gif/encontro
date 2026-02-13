# Development Practices for Claude

## Core Principles

### 1. One Change at a Time
- Make ONE functional change per commit
- Test/verify before moving to next change
- Never bundle unrelated changes together

### 2. Simplicity First
- Start with the simplest working solution
- Add complexity only when simple approach fails
- Prefer modifying existing code over adding new components

### 3. Avoid Breaking Changes
- Don't add new imports unless absolutely necessary
- Don't add new 3D components without confirming they work on Quest
- Use existing parameters/props when possible instead of adding new ones

### 4. VR-Specific Considerations
- Quest browser has limited GPU — keep shaders simple (< 50 iterations)
- HTML overlays are NOT visible in VR headset — only 3D scene content
- `requestAnimationFrame` is NOT used — use `renderer.setAnimationLoop()` for XR compatibility
- 15K particles total budget across all presences
- Target: 72 Hz on Quest 2, 90 Hz on Quest 3

### 5. Before Making Changes
- Read the current code state first
- Understand what's already working
- Identify the minimal change needed

### 6. After Making Changes
- **ALWAYS ask user before running build** — never build without consent
- Commit immediately if build succeeds
- Push so user can test on device

## Collaborative Design Workflow

### Roles
- **User = Creative Director**: Has the artistic vision, makes aesthetic decisions, approves direction
- **Claude = Expert Technician**: Has technical skills, proposes solutions, implements after approval

**CRITICAL: Do NOT jump straight to code.** When the user suggests a new effect or feature:

### Step 1: Understand the Vision
- Ask for references (images, videos, other artworks, descriptions)
- Ask clarifying questions about the feeling/mood they want
- Discuss what makes the reference work visually

### Step 2: Propose Architecture
- Layer name, parameters, behavior, dependencies
- Wait for user confirmation before building

### Step 3: Implement Minimally
- Start with the simplest version
- Push and let user test
- Iterate based on feedback

## Multiplayer-Specific Practices

### Network Code
- Always handle disconnection gracefully
- Never trust client data — server validates
- Keep message sizes small (presence state ~200 bytes)
- Test with simulated latency

### State Synchronization
- Client-side interpolation smooths network jitter
- Server is authoritative for ceremony timing
- Merge detection is client-side but server-confirmed

## Layer-Based Shader Development

Each visual effect should be an **independent, additive layer**:
- Togglable on/off without affecting other layers
- Adjustable independently (intensity, color, timing)
- Removable without rewriting surrounding code

```glsl
vec3 col = vec3(0.0);
// Layer 1: Presence particles
col += presenceLayer;
// Layer 2: Ground glow
col += groundLayer;
// Layer 3: Post-processing
col = applyBloom(col);
```

## Anti-Patterns to Avoid

- Complex 3D text rendering (canvas textures can fail on Quest)
- Multiple new state variables for one feature
- Changing multiple files for one feature when one file would suffice
- Adding React or heavy UI frameworks — this is pure Three.js + minimal DOM
- Over-engineering network protocol before testing basic connectivity
