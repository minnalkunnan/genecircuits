import { Info, RegEdge } from "./analyse";
import { LC, Letter } from "./parts";

export const SCENE_W = 400;
export const SCENE_H = 320;
const BLH = 30;
const CHW = 6.35;

export type SceneNode = {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    color: string;
    sites: (string | null)[];
    gap: boolean;
};

export type SceneArrow = {
    id: string;
    d: string;
    x1: number;
    y1: number;
    tux: number;
    tuy: number;
    tpx: number;
    tpy: number;
    color: string;
    pol: "act" | "rep";
    mult: number;
    self: boolean;
    mx: number;
    my: number;
    incoherent: boolean;
};

export type Scene = { nodes: SceneNode[]; arrows: SceneArrow[] };

function blockW(label: string): number {
    return Math.max(74, Math.round(label.length * CHW) + 18);
}

/** Positions and arrow paths for the derived wiring diagram. Drawing is separate. */
export function buildScene(info: Info[], edges: RegEdge[], incoherent: Set<Letter>): Scene {
    const pos = new Map<number, { x: number; y: number }>();
    const N = info.length;
    if (N === 1) pos.set(info[0].c.id, { x: SCENE_W / 2, y: SCENE_H / 2 });
    else if (N === 2) info.forEach((x, i) => pos.set(x.c.id, { x: SCENE_W / 2, y: 105 + i * 110 }));
    else if (N > 2) {
        const Rr = N <= 4 ? 106 : 118;
        info.forEach((x, i) => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
            pos.set(x.c.id, { x: SCENE_W / 2 + Rr * Math.cos(a) * 1.06, y: SCENE_H / 2 + Rr * Math.sin(a) * 0.92 });
        });
    }

    const nodes: SceneNode[] = info.map((x) => {
        const p = pos.get(x.c.id) ?? { x: 0, y: 0 };
        const label = x.c.name ? `${x.c.name}  ${x.full}` : x.full;
        return {
            id: x.c.id,
            x: p.x,
            y: p.y,
            w: blockW(label),
            h: BLH,
            label,
            color: x.color,
            sites: x.sites.length ? x.sites.slice(0, 3) : [null],
            gap: Boolean(x.gap),
        };
    });
    const nodeOf = new Map(nodes.map((n) => [n.id, n]));
    const halfOf = (id: number) => {
        const n = nodeOf.get(id);
        return { hw: (n ? n.w : 74) / 2 + 4, hh: BLH / 2 + 4, c: pos.get(id) };
    };
    const exitPoint = (id: number, ux: number, uy: number) => {
        const { hw, hh, c } = halfOf(id);
        if (!c) return { x: 0, y: 0 };
        const t = Math.min(Math.abs(ux) < 1e-6 ? 1e9 : hw / Math.abs(ux), Math.abs(uy) < 1e-6 ? 1e9 : hh / Math.abs(uy));
        return { x: c.x + ux * t, y: c.y + uy * t };
    };

    const arrows: SceneArrow[] = [];
    for (const e of edges) {
        const a = pos.get(e.s);
        const b = pos.get(e.t);
        if (!a || !b) continue;
        const col = LC[e.letter];
        if (e.s === e.t) {
            const { hh } = halfOf(e.s);
            const cy = a.y - hh - 20;
            arrows.push({
                id: `${e.s}>${e.t}:${e.letter}`,
                self: true,
                d: `M ${a.x - 16} ${cy + 20} C ${a.x - 26} ${cy - 15} ${a.x + 26} ${cy - 15} ${a.x + 16} ${cy + 18}`,
                x1: a.x + 16,
                y1: cy + 18,
                tux: 0.4,
                tuy: 0.92,
                tpx: -0.92,
                tpy: 0.4,
                color: col,
                pol: e.pol,
                mult: e.mult,
                mx: a.x,
                my: cy,
                incoherent: incoherent.has(e.letter),
            });
            continue;
        }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L;
        const uy = dy / L;
        const p0 = exitPoint(e.s, ux, uy);
        const p1 = exitPoint(e.t, -ux, -uy);
        const twin = edges.some((o) => o.s === e.t && o.t === e.s);
        const off = twin ? 22 : Math.min(24, L * 0.14);
        const mx = (p0.x + p1.x) / 2 - uy * off;
        const my = (p0.y + p1.y) / 2 + ux * off;
        const q = (t: number) => {
            const s = 1 - t;
            return [s * s * p0.x + 2 * s * t * mx + t * t * p1.x, s * s * p0.y + 2 * s * t * my + t * t * p1.y];
        };
        const [xe, ye] = q(1);
        const [xd, yd] = q(0.88);
        const tx = xe - xd;
        const ty = ye - yd;
        const tl = Math.hypot(tx, ty) || 1;
        arrows.push({
            id: `${e.s}>${e.t}:${e.letter}`,
            self: false,
            d: `M ${p0.x} ${p0.y} Q ${mx} ${my} ${xe} ${ye}`,
            x1: xe,
            y1: ye,
            tux: tx / tl,
            tuy: ty / tl,
            tpx: -ty / tl,
            tpy: tx / tl,
            color: col,
            pol: e.pol,
            mult: e.mult,
            mx,
            my,
            incoherent: incoherent.has(e.letter),
        });
    }
    return { nodes, arrows };
}
