export type Letter = "A" | "B" | "C" | "D";
export type Polarity = "act" | "rep";
export type PartType = "op" | "prom" | "dbd" | "dom" | "fp";

export type PartDraft =
    | { t: "op"; L: Letter }
    | { t: "prom" }
    | { t: "dbd"; L: Letter }
    | { t: "dom"; pol: Polarity }
    | { t: "fp"; name: string; color: string };

export type Part = PartDraft & { id: number };

export type Construct = {
    id: number;
    parts: Part[];
    /** Protein name sent to the simulator. Presets use the canvas template names. */
    name?: string;
    gamma: number;
    beta: number;
    init: number;
    basal: number;
    K: number;
    n: number;
};

export type Product =
    | { kind: "reporter" }
    | { kind: "tf"; dbd: Letter; pol: Polarity };

export type ConstructView = {
    sites: Letter[];
    hasProm: boolean;
    product: Product | null;
    fluor: { name: string; color: string } | null;
    color: string;
    gap: string | null;
    promoter: string;
    cds: string;
    full: string;
    short: string;
};

export const LETTERS: Letter[] = ["A", "B", "C", "D"];
export const LC: Record<Letter, string> = {
    A: "#f0a442",
    B: "#b39ddb",
    C: "#67d5d0",
    D: "#7fb4e8",
};
export const FPS = [
    { name: "GFP", color: "#4ade80" },
    { name: "mCherry", color: "#e8879c" },
    { name: "BFP", color: "#8fa6ff" },
];
export const DOM_COL: Record<Polarity, string> = { act: "#7fd18c", rep: "#d98a8a" };
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const TAB = 9;
export const BH = 38;
export const BRICK_R = 9;

let uid = 1000;
export const nid = (): number => ++uid;
export function seedIds(constructs: Construct[]): void {
    const ids = constructs.flatMap((c) => [c.id, ...c.parts.map((p) => p.id)]);
    uid = Math.max(1000, ...ids, uid);
}

export type BrickShape = "sq" | "round" | "tri" | "none";
export type BrickSpec = { w: number; left: BrickShape; right: BrickShape; fill: string; label: string; aria: string };

export function brickPath(w: number, left: BrickShape, right: BrickShape): string {
    const cy = BH / 2;
    const R = BRICK_R;
    let d = `M 0 0 L ${w} 0 L ${w} ${cy - R}`;
    if (right === "round") d += ` C ${w + TAB} ${cy - R} ${w + TAB} ${cy + R} ${w} ${cy + R}`;
    else if (right === "tri") d += ` L ${w + TAB} ${cy} L ${w} ${cy + R}`;
    else if (right === "sq") d += ` L ${w + TAB} ${cy - R} L ${w + TAB} ${cy + R} L ${w} ${cy + R}`;
    else d += ` L ${w} ${cy + R}`;
    d += ` L ${w} ${BH} L 0 ${BH} L 0 ${cy + R}`;
    if (left === "round") d += ` C ${TAB} ${cy + R} ${TAB} ${cy - R} 0 ${cy - R}`;
    else if (left === "tri") d += ` L ${TAB} ${cy} L 0 ${cy - R}`;
    else if (left === "sq") d += ` L ${TAB} ${cy + R} L ${TAB} ${cy - R} L 0 ${cy - R}`;
    else d += ` L 0 ${cy - R}`;
    return d + " Z";
}

export function brickSpec(part: PartDraft): BrickSpec {
    switch (part.t) {
        case "op":
            return { w: 34, left: "sq", right: "sq", fill: LC[part.L], label: part.L, aria: `operator ${part.L}` };
        case "prom":
            return { w: 46, left: "sq", right: "round", fill: "#9aa79c", label: "P", aria: "minimal promoter" };
        case "dbd":
            return { w: 74, left: "round", right: "tri", fill: LC[part.L], label: `DBD_${part.L}`, aria: `DNA-binding domain for promoter ${part.L}` };
        case "dom":
            return {
                w: 40,
                left: "tri",
                right: "none",
                fill: DOM_COL[part.pol],
                label: part.pol === "act" ? "+" : "−",
                aria: part.pol === "act" ? "activation domain" : "repression domain",
            };
        case "fp":
            return { w: 74, left: "round", right: "none", fill: part.color, label: part.name, aria: part.name };
    }
}

export const startsOK = (t: PartType): boolean => t === "op" || t === "prom";
export const follows: Record<PartType, PartType[]> = {
    op: ["op", "prom"],
    prom: ["dbd", "fp"],
    dbd: ["dom"],
    dom: [],
    fp: [],
};

export function canAppend(parts: Part[], t: PartType): boolean {
    if (parts.length === 0) return startsOK(t);
    return follows[parts[parts.length - 1].t].includes(t);
}

export function readConstruct(parts: Part[]): ConstructView {
    const sites = parts.filter((p): p is Extract<Part, { t: "op" }> => p.t === "op").map((p) => p.L);
    const hasProm = parts.some((p) => p.t === "prom");
    const dbd = parts.find((p): p is Extract<Part, { t: "dbd" }> => p.t === "dbd");
    const dom = parts.find((p): p is Extract<Part, { t: "dom" }> => p.t === "dom");
    const fp = parts.find((p): p is Extract<Part, { t: "fp" }> => p.t === "fp");
    const promoter = !hasProm ? "p?" : sites.length ? "p" + sites.join("") : "pConst";
    let cds: string;
    let product: Product | null = null;
    let color: string | null = null;
    let gap: string | null = null;
    let fluor: { name: string; color: string } | null = null;
    if (fp) {
        cds = fp.name;
        product = { kind: "reporter" };
        color = fp.color;
        fluor = { name: fp.name, color: fp.color };
    } else if (dbd && dom) {
        cds = `TF_${dbd.L}(${dom.pol === "act" ? "+" : "−"})`;
        product = { kind: "tf", dbd: dbd.L, pol: dom.pol };
        color = LC[dbd.L];
    } else if (dbd) {
        cds = `TF_${dbd.L}(?)`;
        color = LC[dbd.L];
        gap = `no effector domain — it binds promoter ${dbd.L} but changes nothing`;
    } else {
        cds = "—";
        gap = "no coding sequence";
    }
    if (!hasProm) gap = "no promoter — never transcribed";
    return {
        sites,
        hasProm,
        product,
        fluor,
        color: color || "#9aa79c",
        gap,
        promoter,
        cds,
        full: `${promoter}__${cds}`,
        short: cds,
    };
}

export function op(L: Letter, id = nid()): Extract<Part, { t: "op" }> {
    return { id, t: "op", L };
}
export function prom(id = nid()): Extract<Part, { t: "prom" }> {
    return { id, t: "prom" };
}
export function dbd(L: Letter, id = nid()): Extract<Part, { t: "dbd" }> {
    return { id, t: "dbd", L };
}
export function dom(pol: Polarity, id = nid()): Extract<Part, { t: "dom" }> {
    return { id, t: "dom", pol };
}
export function fp(index: number, id = nid()): Extract<Part, { t: "fp" }> {
    return { id, t: "fp", ...FPS[index] };
}

export function construct(id: number, parts: Part[], o: Partial<Omit<Construct, "id" | "parts">> = {}): Construct {
    return {
        id,
        parts,
        name: o.name,
        gamma: o.gamma ?? 1,
        beta: o.beta ?? 1,
        init: o.init ?? 0,
        basal: o.basal ?? 0,
        K: o.K ?? 1,
        n: o.n ?? 2,
    };
}
