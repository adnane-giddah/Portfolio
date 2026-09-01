# Ahmed Adnane Meddah — portfolio (React + TypeScript)

A port of the original single-file `index.html` to Vite + React 18 + TypeScript,
with the three-floor platformer intact.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck, then build to dist/
npm run preview    # serve the built dist/
npm test           # engine physics + full app mount
```

## How it is put together

```
src/
  data/          all content and level data — no copy lives in a component
    profile.ts     hero, education, medals, coaching, projects, skills, contact
    world.ts       floors, lifts, platforms, crates, pads, movers, sigils, NPCs
  world/
    engine.ts      the game: physics + canvas drawing. Imports no React.
    World.tsx      mounts the engine, renders the HUD/dialogue/panel overlay
    Minimap.tsx  Dialogue.tsx  Panel.tsx  TouchPad.tsx
  components/    the page
  hooks/         progress (localStorage), theme, media queries, reveal, toasts
  styles/        page.css + world.css, carried over from the original
```

Two decisions worth knowing about:

**The engine is not a React component.** It owns the canvas and runs its own
`requestAnimationFrame` loop, and talks to React through four callbacks
(`onHud`, `onPrompt`, `onTalk`, `onSigil`). Nothing at 60fps touches
`setState`, so the DOM overlay only re-renders when something actually
changes — a floor, a prompt, a collected sigil.

**Gated sections render twice instead of moving.** The original physically
moved DOM nodes out of the page and into the world's panel, then put them
back. Here each section is a component (`AboutBody`, `ProjectsBody`, …)
rendered in both places. Same result, no DOM surgery.

## The cursor

The original set `body { cursor: none }` and drew a small orange dot in its
place, which is why the pointer looked invisible. That is gone: the real
system cursor is always visible, and the orange ring is now a hollow accent
that trails it. On touch devices the ring is not rendered at all.

## Progress

Met characters and collected sigils persist in `localStorage` under
`aam_world`; the theme under `aam_theme`. Every read and write is wrapped
in `try`/`catch`, so private windows and blocked storage degrade to a fresh
start rather than a broken page.

## Deploying

`vite.config.ts` sets `base: './'`, so `dist/` works from any path —
including a project subfolder on GitHub Pages. Build, then publish `dist/`.

Replace `public/cv.pdf` with the real CV, and swap `src/assets/shot.ts`
(currently an inline placeholder SVG) for a real screenshot.
