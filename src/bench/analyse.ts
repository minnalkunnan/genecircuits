import { Construct, ConstructView, Letter, readConstruct } from "./parts";

export type RegEdge = {
    s: number;
    t: number;
    pol: "act" | "rep";
    letter: Letter;
    mult: number;
};

export type Info = ConstructView & { c: Construct };

export type Note = { tone: "mut" | "warn"; text: string };

export type Analysis = {
    info: Info[];
    edges: RegEdge[];
    incoherent: Set<Letter>;
    dangling: Info[];
    main: string;
    notes: Note[];
};

function cyclesOf(info: Info[], edges: RegEdge[]): { nodes: number[]; edges: RegEdge[] }[] {
    const order = info.map((x) => x.c.id);
    const pos = new Map(order.map((id, i) => [id, i]));
    const adj = new Map<number, RegEdge[]>();
    for (const e of edges) {
        const list = adj.get(e.s) ?? [];
        list.push(e);
        adj.set(e.s, list);
    }
    const out: { nodes: number[]; edges: RegEdge[] }[] = [];
    for (const st of order) {
        const sp = pos.get(st) ?? 0;
        const path = [st];
        const pe: RegEdge[] = [];
        const on = new Set([st]);
        const dfs = (nd: number) => {
            for (const e of adj.get(nd) ?? []) {
                if (e.t === st) out.push({ nodes: [...path], edges: [...pe, e] });
                else if (!on.has(e.t) && (pos.get(e.t) ?? -1) > sp) {
                    on.add(e.t);
                    path.push(e.t);
                    pe.push(e);
                    dfs(e.t);
                    on.delete(e.t);
                    path.pop();
                    pe.pop();
                }
            }
        };
        dfs(st);
    }
    return out;
}

export function analyse(constructs: Construct[]): Analysis {
    const info: Info[] = constructs.map((c) => ({ c, ...readConstruct(c.parts) }));
    const byLetter = new Map<Letter, Info[]>();
    info.forEach((x) => {
        if (x.product?.kind !== "tf") return;
        const list = byLetter.get(x.product.dbd) ?? [];
        list.push(x);
        byLetter.set(x.product.dbd, list);
    });
    const incoherent = new Set<Letter>();
    for (const [L, list] of byLetter) {
        if (list.some((x) => x.product?.kind === "tf" && x.product.pol === "act") && list.some((x) => x.product?.kind === "tf" && x.product.pol === "rep")) {
            incoherent.add(L);
        }
    }
    const emap = new Map<string, RegEdge>();
    info.forEach((t) => t.sites.forEach((L) => {
        for (const s of byLetter.get(L) ?? []) {
            if (s.product?.kind !== "tf") continue;
            const k = `${s.c.id}>${t.c.id}`;
            const existing = emap.get(k);
            if (!existing) emap.set(k, { s: s.c.id, t: t.c.id, pol: s.product.pol, letter: L, mult: 1 });
            else existing.mult += 1;
        }
    }));
    const edges = [...emap.values()];
    const dangling = info.filter((x) => {
        if (x.product?.kind !== "tf") return false;
        const dbd = x.product.dbd;
        return !info.some((t) => t.sites.includes(dbd));
    });

    const notes: Note[] = [];
    for (const x of info) if (x.gap) notes.push({ tone: "mut", text: `${x.full}: ${x.gap}.` });
    for (const L of incoherent) {
        const who = info.filter((x) => x.product?.kind === "tf" && x.product.dbd === L);
        notes.push({ tone: "warn", text: `Promoter ${L} is targeted by both ${who.map((x) => x.short).join(" and ")} — opposite domains at one operator. The sketch applies both; real proteins would compete for the site.` });
    }
    for (const x of dangling) {
        if (x.product?.kind === "tf") notes.push({ tone: "mut", text: `${x.short} targets promoter ${x.product.dbd}, which no construct carries — it regulates nothing yet.` });
    }
    if (edges.some((e) => e.mult > 1)) {
        notes.push({ tone: "mut", text: "Repeated operators are drawn on the diagram. The simulator applies each regulator once; copy-number sharpening is not in this model." });
    }
    const regsByTarget = new Map<number, number>();
    for (const e of edges) regsByTarget.set(e.t, (regsByTarget.get(e.t) ?? 0) + 1);
    if ([...regsByTarget.values()].some((n) => n > 2)) {
        notes.push({ tone: "warn", text: "A promoter has more than two regulators. The simulator sends the first two through an AND gate." });
    }

    let main: string;
    const cyc = cyclesOf(info, edges);
    if (!info.length) main = "Empty bench — drag a part across, or tap one.";
    else if (!cyc.length) main = edges.length === 0 ? "Nothing is wired: no factor targets an operator that exists." : "Open circuit, no feedback — transients, then a steady state.";
    else {
        const tagged = cyc.map((c) => ({ ...c, neg: c.edges.filter((e) => e.pol === "rep").length % 2 === 1 }));
        const negs = tagged.filter((c) => c.neg);
        const poss = tagged.filter((c) => !c.neg);
        if (negs.length) {
            const c = negs.reduce((a, b) => (a.nodes.length <= b.nodes.length ? a : b));
            main = c.nodes.length === 1
                ? "Negative autoregulation — a set point, not a clock."
                : `Negative feedback loop of ${c.nodes.length} — oscillation is possible.`;
            if (c.nodes.length >= 3) {
                const lg = info.filter((x) => c.nodes.includes(x.c.id)).map((x) => x.c);
                if (lg.some((g) => g.n < 3)) notes.push({ tone: "mut", text: "Hill coefficient below 3 on the loop — it may settle at a fixed point instead of oscillating." });
            }
            if (poss.length) notes.push({ tone: "mut", text: `A positive loop of ${poss[0].nodes.length} is also present.` });
        } else {
            const c = poss.reduce((a, b) => (a.nodes.length <= b.nodes.length ? a : b));
            main = c.nodes.length === 1
                ? "Positive autoregulation — bistable."
                : `Positive feedback loop of ${c.nodes.length} — bistable: it locks into one pattern and holds it.`;
        }
    }

    return { info, edges, incoherent, dangling, main, notes };
}
