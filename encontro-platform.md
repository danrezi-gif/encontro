# ENCONTRO — Platform Architecture
## A Living Topology of Minds

*Integrating signal-based matching with immersive encounter space*

---

## 0. THE CORE IDEA IN ONE PARAGRAPH

ENCONTRO is a two-level platform. At the surface level: a p2p signal network where users cast expressive artifacts — color, gesture, sound, mark — into an open topology, and an agent crawls that network looking for resonance matches. At the deep level: a WebXR encounter space, forked from Ontik, where matched presences meet without identity, without language, as fields of luminous consciousness. The platform does not optimize for engagement. It optimizes for genuine encounter. The longing that drives people to open their phones is real. This is an attempt to give it somewhere real to go.

---

## 1. CONCEPTUAL ARCHITECTURE

### Two Levels, One System

```
LEVEL 1 — THE SIGNAL LAYER (Platform / Web)
────────────────────────────────────────────
User enters open space
↓
Creates expressive signal (color, shape, sound, gesture)
↓
Agent broadcasts signal into p2p topology
↓
Agent searches for resonant fields
↓
Match found → invitation issued
↓

LEVEL 2 — THE ENCOUNTER LAYER (WebXR / Encontro)
─────────────────────────────────────────────────
Two presences enter shared immersive space
↓
No names. No profiles. No text.
↓
Luminous fields approach, interpenetrate, merge
↓
Ceremony unfolds (25-minute arc)
↓
Participants carry traces of each other out
↓
Optional: leave artifact of encounter
```

### The Relationship Between Levels

Level 1 is the ocean. Level 2 is where the bottles find each other and open.

Level 1 can be accessed from any device — phone, laptop, tablet. No headset required. This is critical for adoption. The signal layer must have near-zero friction to enter.

Level 2 is the depth experience. It works in browser WebXR (no headset), mobile VR, or full headset. The encounter is richer with immersion but functional without it.

The agent is the bridge. It lives between levels, crawling the signal topology, reading resonance patterns, issuing invitations. It never stores identity. It only works with live signals and transient matches.

---

## 2. LEVEL 1 — THE SIGNAL LAYER

### 2.1 The Expressive Signal

The user does not fill a profile. The user does not write a bio. The user makes something.

On entering the platform, they are given a minimal canvas of expressive tools:

**Color field** — a gradient or palette they build by touch/click. Not choosing from presets. Actually mixing. The choices, the rhythm of mixing, the final palette — all carry signal.

**Sonic gesture** — a short ambient loop they compose from tonal primitives. Pitch, texture, rhythm, density. Again: not selecting presets but making something. Duration: 10-30 seconds.

**Mark** — a single drawn gesture on a blank surface. Freehand. Not illustrated, not finished. The quality of line, pressure, speed, direction — these carry information the maker may not consciously intend.

**Textless intention** — not a description but a felt-sense selection. Abstract glyphs or shapes that correspond to inner states. Something close to the I Ching's symbolic vocabulary or Jungian archetypes. Not "I want to talk about consciousness" but something more somatic and pre-linguistic.

Together these four constitute the **signal artifact** — a small expressive object that represents the user's current field state, not their permanent identity.

Signal artifacts are ephemeral. They expire. They are not stored as profile content. Each session, you make a new one.

### 2.2 The P2P Topology

The platform is built on a p2p networking layer. Candidates:

**WebRTC** — browser-native, no central server required for data exchange once connection is established. Already used for video calling. Can be repurposed for signal exchange.

**Gun.js** — a decentralized, real-time graph database that runs p2p in the browser. No central server. Data lives at the edges. Open source. Actively maintained. Strong fit.

**Hypercore Protocol / Holepunch** — more radical p2p stack, used by Keet. Stronger privacy guarantees. Higher technical complexity.

**Recommended starting point**: Gun.js for the signal layer. It's JavaScript-native, works in the browser, has real-time sync, and the mental model aligns with the topology metaphor — a living graph, not a database.

Signal artifacts are broadcast into the Gun graph as nodes with no attached identity — only the artifact data and a session ephemeral key.

### 2.3 The Agent

The matching agent runs client-side (or on a minimal edge server) and does the following:

**Reads** the user's signal artifact as a multidimensional pattern. Color: hue distribution, saturation, contrast profile. Sound: frequency spectrum, rhythmic density, tonal texture. Mark: stroke velocity, directionality, density, open/closed form. Intention: symbolic selections as a vector.

**Crawls** the active signal topology — other live signal artifacts currently broadcast in the network.

**Computes resonance** — not simple similarity. The resonance function should weight for:
- Complementary elements (different mark quality but similar color temperature)
- Shared archetypal symbols in the intention layer
- Sonic compatibility (harmonically related, not identical)
- Temporal proximity (signals made recently, indicating live presence)

**Issues invitation** — when resonance threshold is met, both users receive a signal: *something found you*. Not a notification. Something more like a pulse in the visual field. They can accept, defer, or release.

The agent does not know who the users are. It only knows their current signal artifacts. This is architecturally enforced privacy, not policy.

### 2.4 The Visualization

This is where the living topology becomes visible.

The platform's primary interface is not a feed, not a list, not a grid. It is a **field visualization** — a dynamic, living render of signal artifacts in the network, represented as nodes of light with gravitational relationships.

Proximity in the visualization = resonance, not geography or social graph.

Your node pulses at the center. Others drift in the field at varying distances. You can see their color fields and hear faint traces of their sonic gestures as they approach. The whole thing moves — breathing, clustering, dispersing — in real time as people enter and leave.

This is TouchDesigner logic applied to a web interface. Force-directed graph with aesthetic rendering. Three.js or a lightweight GLSL layer over Canvas. This is buildable with your existing visual skills and stack.

When a match is found, two nodes begin moving toward each other in the field. The approach is visible to both. It's the first moment of encounter — before the encounter space opens.

---

## 3. LEVEL 2 — THE ENCOUNTER LAYER (ENCONTRO WebXR)

### 3.1 Existing Foundation

The Encontro WebXR space is the fork of Ontik already in development. Its core mechanics — luminous presences, shader-based field aesthetics, ceremony arc, no identity markers — remain as designed in the previous architecture document.

What changes with the platform integration:

**Entry is now earned, not random.** You don't enter the encounter space cold. You arrive because the agent found resonance. This changes the phenomenology of entry completely. You already know that whoever you're meeting was vibrating at a similar frequency moments ago. The encounter begins with that knowledge, wordlessly.

**The signal artifact seeds the encounter aesthetics.** The color field the user built in Level 1 becomes the chromatic basis of their presence in Level 2. Your sonic gesture becomes the seed of your sound signature in the space. The mark you drew influences the shape language of your luminous field. There is continuity between the signal you cast and the presence you arrive as. This is subtle but important — it means you arrive as yourself, not as a generic avatar.

**The encounter arc remains intact:**

```
Arrival (3 min)      — solo orientation, presence establishing
Approach (5 min)     — fields becoming aware of each other
Encounter (10 min)   — interpenetration, merge, co-creation
Release (4 min)      — gradual separation, traces retained
Reflection (3 min)   — solo, option to leave artifact
```

Total: ~25 minutes. A ceremony.

### 3.2 Communication Without Language

The encounter space has no text chat. No voice by default (optional in future versions as an opt-in).

Communication happens through:

**Spatial movement** — how you move toward or away, the rhythm of approach, circling, stillness.

**Gesture vocabulary** — a small set of intentional gestures (borrowed and simplified from Sky's language): offering, receiving, gratitude, wonder, presence. Triggered by controller input or hand tracking, rendered as luminous emanations from the presence field.

**Shared making** — in the merge state, both presences can collaboratively affect the shared visual field. Movements become marks in the space. Sound signatures combine into harmonics neither could produce alone. The encounter generates an artifact — a visual/sonic record of what happened between two specific fields at a specific moment. This artifact is the only persistent output of the ceremony.

**Resonance feedback** — the space itself responds to the quality of presence. Genuine stillness, genuine attention, genuine openness — these have a different visual signature than nervous movement or disengagement. The shader responds. This is not gamification. It's the space being honest about what's happening.

---

## 4. THE AGENT — TECHNICAL SPECIFICATION

### 4.1 Signal Encoding

Each signal artifact is encoded as a vector:

```typescript
interface SignalArtifact {
  sessionKey: string          // ephemeral, not tied to identity
  timestamp: number           // for freshness weighting
  colorProfile: {
    dominantHues: number[]    // HSL values, sorted by weight
    saturationMean: number
    brightnessProfile: number[]
    warmthCoolBalance: number
  }
  sonicProfile: {
    frequencyCenter: number   // dominant frequency band
    harmonicDensity: number   // how many simultaneous tones
    rhythmicPulse: number     // beats per minute equivalent
    textureRoughness: number  // tonal vs noisy
  }
  markProfile: {
    strokeVelocityMean: number
    directionality: number    // 0=chaotic, 1=directional
    closureIndex: number      // 0=open forms, 1=closed
    densityMap: number[]      // spatial distribution
  }
  intentionVector: number[]   // symbolic selections as embedding
}
```

### 4.2 Resonance Function

Resonance is not dot product similarity. The function weights:

```typescript
function computeResonance(a: SignalArtifact, b: SignalArtifact): number {
  
  // Harmonic compatibility (not identical frequency, but musically related)
  const sonicHarmony = harmonicCompatibility(a.sonicProfile, b.sonicProfile)
  
  // Color resonance (complementary or analogous, not necessarily matching)
  const colorResonance = colorFieldResonance(a.colorProfile, b.colorProfile)
  
  // Mark polarity (high similarity OR interesting complementarity)
  const markResonance = markPolarity(a.markProfile, b.markProfile)
  
  // Intention overlap (shared symbolic territory)
  const intentionResonance = cosineSimilarity(a.intentionVector, b.intentionVector)
  
  // Freshness (both signals recent = live presence)
  const temporalProximity = freshnessScore(a.timestamp, b.timestamp)
  
  // Weighted composite
  return (
    sonicHarmony * 0.25 +
    colorResonance * 0.20 +
    markResonance * 0.20 +
    intentionResonance * 0.25 +
    temporalProximity * 0.10
  )
}
```

The resonance threshold for issuing an invitation is configurable. Start high (0.75+) for quality. Can be tuned based on network density.

### 4.3 Agent Behavior

The agent runs as a background process on the client — a Web Worker in the browser. It:

- Broadcasts the user's signal artifact to the Gun.js graph on session start
- Listens for new artifacts appearing in the graph
- Computes resonance scores continuously against live artifacts
- Issues invitation when threshold exceeded, waiting for both parties to accept
- Cleans up: removes artifact from graph when session ends or expires (30 min default)
- Never logs, never stores, never transmits identity

The agent can optionally run enhanced matching via a Claude API call — sending the encoded signal vectors and asking for a semantic interpretation of resonance quality. This adds latency but depth. Optional, off by default.

---

## 5. TECHNICAL STACK

### 5.1 Signal Layer

```
Frontend:     Next.js (existing Entrementes stack)
P2P Layer:    Gun.js
Visualization: Three.js / GLSL Canvas
Signal Tools:  Canvas API (mark), Web Audio API (sonic), CSS/WebGL (color)
Agent:        Web Worker + optional Claude API
Hosting:      Vercel (existing)
```

### 5.2 Encounter Layer

```
Core:         Three.js + WebXR API (fork of Ontik)
Networking:   WebRTC (via PeerJS or simple-peer for direct p2p audio/state)
Shaders:      GLSL (existing Ontik shaders adapted)
Presence:     Particle systems seeded from signal artifacts
Sound:        Tone.js (signal-seeded generative audio)
Server:       Minimal WebSocket signaling server (for WebRTC handshake only)
Hosting:      GitHub Pages / Vercel
```

### 5.3 The Bridge

A thin coordination layer handles:
- Session handoff from Signal Layer to Encounter Layer
- Passing signal artifact data to seed encounter aesthetics
- Managing ceremony state (arc timing, phase transitions)
- Generating and storing the encounter artifact (client-side only)

---

## 6. MVP SCOPE

### What ships first

**Phase 0 — Signal Canvas (2-4 weeks)**
- Single-page web app
- Color mixing tool
- Simple mark canvas
- Sonic gesture builder (3-4 tonal primitives)
- Intention symbol selection
- Signal artifact encoding
- No networking yet — local only
- Goal: validate that the expressive tools feel right

**Phase 1 — Living Topology (4-6 weeks)**
- Gun.js integration
- Signal broadcast and receipt
- Basic force-directed visualization (Three.js)
- Nodes visible as color fields in the topology
- No matching yet — just presence in the shared field
- Goal: validate that seeing others' signals in a living topology feels meaningful

**Phase 2 — The Agent (4-6 weeks)**
- Resonance function implemented
- Agent running as Web Worker
- Invitation mechanic
- Acceptance/deferral UI (minimal, gestural)
- Goal: validate that agent-brokered matches feel qualitatively different from random

**Phase 3 — Encounter Integration (6-8 weeks)**
- WebRTC connection on match
- Handoff to Encontro WebXR space
- Signal-seeded presence aesthetics
- Ceremony arc implemented
- Goal: complete two-level flow functional end to end

**Phase 4 — Refinement**
- Shader polish
- Sound design
- Encounter artifact generation
- Mobile optimization
- Beta with trusted community (psychedelic integration network, Entrementes audience, consciousness researchers)

### What does NOT ship in MVP

- Voice communication
- Any form of persistent identity or profile
- Social graph or follower mechanics
- Analytics or engagement metrics
- Monetization layer
- Scale infrastructure

---

## 7. DESIGN PRINCIPLES (NON-NEGOTIABLE)

**No identity accumulation.** The platform must be architecturally incapable of building persistent profiles. Signal artifacts expire. Encounter records are stored only client-side, never server-side. There is no feed of your history.

**No engagement optimization.** No streak mechanics, no notification loops, no algorithmic recommendations. The platform does not want your time. It wants your presence, briefly, when you choose to offer it.

**Asymmetric depth.** The signal layer is frictionless but the encounter layer has weight. Not everything that enters Level 1 reaches Level 2. Matching is genuinely selective. The encounter is genuinely rare. Rarity is a feature.

**Expressive primacy.** The tools for making the signal artifact are the product. Not the matching. Not the encounter space. If the making doesn't feel expressive and genuine, nothing downstream works.

**Honest about limitation.** The platform cannot deliver what the deepest longing wants. It can create conditions where genuine encounter becomes more likely. That is what it claims to do, no more.

---

## 8. CONCEPTUAL LINEAGE

The ideas this builds on, honestly acknowledged:

- **Sky: Children of the Light** — gesture vocabulary, non-verbal encounter, aesthetic as primary language
- **Chatroulette / Omegle** — the accidental discovery that random human encounter has genuine value, and the failure to hold it
- **Gun.js ecosystem** — the p2p web as infrastructure for non-corporate network topology
- **Buber's I-Thou** — encounter as the fundamental unit of meaning, not content or information
- **MDMA phenomenology** — reduced threat-detection, amplified warmth, ego-softening as the design target state
- **Ontik VR** — existing shader and WebXR infrastructure
- **Entrementes** — the broader ecosystem this lives within, the audience it serves first
- **Living topology of minds** — the visualization principle that names what this is trying to be

---

## 9. THE QUESTION THIS PROJECT IS ASKING

*Can a designed system create conditions for genuine encounter between human fields of consciousness — without capturing, commodifying, or substituting for that encounter?*

The answer is not known. Building the system is how you find out.

---

*Document version: 0.1 — February 2026*
*Daniel Rezinovsky / Entrementes*
