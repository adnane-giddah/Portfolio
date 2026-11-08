import { CRATES, FLOORS, LIFTS, NPCS, PLATS, SIGILS } from '../data/world';

// Floor plan of the game, drawn straight from the level data.
const W = 1000;
const PAD = 34;
const SPAN = FLOORS[0].x1 - FLOORS[0].x0;
const STOREY = 142;
const K = 0.3;

const X = (x: number) => PAD + ((x - FLOORS[0].x0) / SPAN) * (W - PAD * 2);
const GY = (f: number) => 448 - f * STOREY;
const sx = (w: number) => (w / SPAN) * (W - PAD * 2);

function hex(cx: number, cy: number, r: number) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Cube({ x, y, s }: { x: number; y: number; s: number }) {
  const d = s * 0.32;
  return (
    <g className="wm-cube">
      <polygon className="top" points={`${x},${y} ${x + d},${y - d} ${x + s + d},${y - d} ${x + s},${y}`} />
      <polygon className="side" points={`${x + s},${y} ${x + s + d},${y - d} ${x + s + d},${y + s - d} ${x + s},${y + s}`} />
      <rect className="front" x={x} y={y} width={s} height={s} />
    </g>
  );
}

export function WorldMap({ onPlay }: { onPlay: () => void }) {
  return (
    <button type="button" className="world-map" onClick={onPlay} aria-label="Open the game">
      <svg viewBox={`0 0 ${W} 470`} role="img" aria-label="Floor plan of the three-floor game">
        <polygon
          className="wm-shell"
          points={`${PAD - 12},${GY(2) - STOREY + 30} ${PAD + 18},${GY(2) - STOREY} ${W - PAD + 12},${GY(2) - STOREY} ${W - PAD + 12},${GY(0) + 10} ${PAD - 12},${GY(0) + 10}`}
        />

        {FLOORS.map((fl, f) => (
          <g key={fl.name}>
            <rect className="wm-slab" x={PAD} y={GY(f)} width={W - PAD * 2} height={5} />
            <text className="wm-floor" x={PAD + 8} y={GY(f) - STOREY + 26}>
              F{f + 1} {fl.name}
            </text>
            <text className="wm-sub" x={PAD + 8} y={GY(f) - STOREY + 42}>
              {fl.sub}
            </text>
          </g>
        ))}

        {LIFTS.map((l) => {
          const top = GY(l.b) + 5;
          const bot = GY(l.a);
          return (
            <g key={l.x}>
              <line className="wm-shaft" x1={X(l.x)} x2={X(l.x)} y1={top} y2={bot} />
              <rect className="wm-car" x={X(l.x) - 7} y={bot - 16} width={14} height={14}
                style={{ ['--lift' as string]: `${top - bot + 16}px` }} />
            </g>
          );
        })}

        {PLATS.map((p, i) => (
          <rect key={i} className="wm-plat" x={X(p.x)} y={GY(p.f) - p.dy * K} width={sx(p.w)} height={3} />
        ))}

        {CRATES.map((c, i) => {
          const s = sx(c.w);
          const stack = Math.round(c.h / c.w);
          return Array.from({ length: stack }, (_, j) => (
            <Cube key={`${i}-${j}`} x={X(c.x)} y={GY(c.f) - s * (j + 1)} s={s} />
          ));
        })}

        {SIGILS.map((g) => (
          <text key={g.id} className="wm-sigil" x={X(g.x)} y={GY(g.f) - g.dy * K}>
            {g.s}
          </text>
        ))}

        {NPCS.map((n) => {
          const cx = X(n.x);
          const cy = GY(n.f) - (n.dy ?? 0) * K - 20;
          return (
            <g key={n.id} className="wm-npc">
              <polygon points={hex(cx, cy, 15)} />
              <text className="wm-glyph" x={cx} y={cy + 5}>{n.glyph}</text>
              <text className="wm-label" x={cx} y={cy - 22}>{n.title}</text>
            </g>
          );
        })}

        <g className="wm-walker">
          <rect x={X(0)} y={GY(0) - 13} width={8} height={12} rx={1} />
          <rect className="eye" x={X(0) + 5} y={GY(0) - 10} width={2} height={2} />
        </g>
      </svg>
    </button>
  );
}
