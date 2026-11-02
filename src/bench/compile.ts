import { analyse, Info } from "./analyse";
import { Construct } from "./parts";

export type SimulateProtein = {
    label: string;
    initialConcentration: number;
    lossRate: number;
    beta: number;
    K: number;
    inputs: number;
    outputs: number;
    inputFunctionType: "steady-state";
    inputFunctionData: {
        steadyStateValue: number;
        timeStart: number;
        timeEnd: number;
        pulsePeriod: number;
        amplitude: number;
        dutyCycle: number;
    };
};

export type SimulateNode = { id: string; type: string; proteinName?: string };
export type SimulateEdge = { id: string; type: "promote" | "repress"; source: string; target: string };

export type SimulateRequest = {
    circuitSettings: { projectName: string; simulationDuration: number; numTimePoints: number };
    nodes: SimulateNode[];
    edges: SimulateEdge[];
    proteins: Record<string, SimulateProtein>;
    hillCoefficients: { id: string; value: number }[];
};

function inputData(basal: number): SimulateProtein["inputFunctionData"] {
    return {
        steadyStateValue: basal,
        timeStart: 0,
        timeEnd: 1,
        pulsePeriod: 1,
        amplitude: 1,
        dutyCycle: 0.5,
    };
}

function safeName(view: Info, used: Set<string>): string {
    const raw = view.c.name ?? view.full;
    let base = raw.replace(/[^A-Za-z0-9_]/g, "") || `P${view.c.id}`;
    if (!/^[A-Za-z]/.test(base)) base = `P${base}`;
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}_${i++}`;
    used.add(name);
    return name;
}

/** Constructs the backend can integrate: a promoter and a finished product. */
export function simulatable(view: Info): boolean {
    return view.hasProm && view.product !== null && view.gap === null;
}

/**
 * Turn brick constructs into the JSON POST /api/simulate already accepts.
 * One regulator is a direct edge. Two regulators become an `and` node,
 * which the parser reads as an Appendix D product.
 */
export function compileCircuit(constructs: Construct[], duration: number): SimulateRequest {
    const an = analyse(constructs);
    const used = new Set<string>();
    const named = an.info.filter(simulatable).map((view) => ({ view, name: safeName(view, used) }));
    const idOf = new Map(named.map((n) => [n.view.c.id, `p${n.view.c.id}`]));
    const nameOf = new Map(named.map((n) => [n.view.c.id, n.name]));
    const nOf = new Map(named.map((n) => [n.view.c.id, Math.round(n.view.c.n)]));

    const nodes: SimulateNode[] = named.map((n) => ({
        id: idOf.get(n.view.c.id) as string,
        type: "custom",
        proteinName: n.name,
    }));
    const proteins: Record<string, SimulateProtein> = {};
    for (const n of named) {
        const c = n.view.c;
        proteins[n.name] = {
            label: n.name,
            initialConcentration: c.init,
            lossRate: c.gamma,
            beta: c.beta,
            K: c.K > 0 ? c.K : 1,
            inputs: 1,
            outputs: 1,
            inputFunctionType: "steady-state",
            inputFunctionData: inputData(c.basal),
        };
    }

    const byTarget = new Map<number, typeof an.edges>();
    for (const e of an.edges) {
        if (!nameOf.has(e.s) || !nameOf.has(e.t)) continue;
        const list = byTarget.get(e.t) ?? [];
        list.push(e);
        byTarget.set(e.t, list);
    }

    const edges: SimulateEdge[] = [];
    const hillCoefficients: { id: string; value: number }[] = [];
    let ei = 0;
    for (const [tid, regs] of byTarget) {
        const usedRegs = [...regs].sort((a, b) => a.s - b.s).slice(0, 2);
        const targetNode = idOf.get(tid) as string;
        const targetName = nameOf.get(tid) as string;
        const pushHill = (sourceId: number) => {
            hillCoefficients.push({
                id: `${nameOf.get(sourceId)}-${targetName}`,
                value: nOf.get(sourceId) ?? 1,
            });
        };
        if (usedRegs.length === 1) {
            const e = usedRegs[0];
            edges.push({
                id: `e${ei++}`,
                type: e.pol === "act" ? "promote" : "repress",
                source: idOf.get(e.s) as string,
                target: targetNode,
            });
            pushHill(e.s);
        } else {
            const gateId = `and${tid}`;
            nodes.push({ id: gateId, type: "and" });
            for (const e of usedRegs) {
                edges.push({
                    id: `e${ei++}`,
                    type: e.pol === "act" ? "promote" : "repress",
                    source: idOf.get(e.s) as string,
                    target: gateId,
                });
                pushHill(e.s);
            }
            edges.push({ id: `e${ei++}`, type: "promote", source: gateId, target: targetNode });
        }
    }

    return {
        circuitSettings: {
            projectName: "Brick Bench",
            simulationDuration: duration,
            numTimePoints: 80,
        },
        nodes,
        edges,
        proteins,
        hillCoefficients,
    };
}
