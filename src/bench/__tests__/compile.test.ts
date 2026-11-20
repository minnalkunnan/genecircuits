import { compileCircuit } from "../compile";
import { construct, dbd, dom, fp, op, prom } from "../parts";
import { PRESETS } from "../presets";

function edgeNames(payload: ReturnType<typeof compileCircuit>, type: "promote" | "repress") {
    return payload.edges
        .filter((e) => e.type === type)
        .map((e) => {
            const src = payload.nodes.find((n) => n.id === e.source);
            const tgt = payload.nodes.find((n) => n.id === e.target);
            return `${src?.proteinName ?? src?.type ?? src?.id}->${tgt?.proteinName ?? tgt?.type ?? tgt?.id}`;
        })
        .sort();
}

describe("compileCircuit", () => {
    it("matches the repressilator template's regulatory structure", () => {
        const payload = compileCircuit(PRESETS.repressilator.make(), PRESETS.repressilator.T);
        expect(payload.nodes.map((n) => n.type)).toEqual(["custom", "custom", "custom"]);
        expect(payload.proteins.Gene1).toMatchObject({ initialConcentration: 1, lossRate: 1, beta: 5, K: 1 });
        expect(payload.proteins.Gene1.inputFunctionData.steadyStateValue).toBe(0);
        expect(payload.proteins.Gene2).toMatchObject({ initialConcentration: 1, lossRate: 1, beta: 5 });
        expect(payload.proteins.Gene3).toMatchObject({ initialConcentration: 1.2, lossRate: 1, beta: 5 });
        expect(edgeNames(payload, "repress")).toEqual(["Gene1->Gene2", "Gene2->Gene3", "Gene3->Gene1"].sort());
        expect(payload.edges.some((e) => e.type === "promote")).toBe(false);
        const hills = Object.fromEntries(payload.hillCoefficients.map((h) => [h.id, h.value]));
        expect(hills["Gene1-Gene2"]).toBe(3);
        expect(hills["Gene2-Gene3"]).toBe(3);
        expect(hills["Gene3-Gene1"]).toBe(3);
    });

    it("matches the toggle template's regulatory structure", () => {
        const payload = compileCircuit(PRESETS.toggle.make(), PRESETS.toggle.T);
        expect(payload.proteins.ProteinA).toMatchObject({ initialConcentration: 1, lossRate: 0.2, beta: 1, K: 1 });
        expect(payload.proteins.ProteinB).toMatchObject({ initialConcentration: 0, lossRate: 0.2, beta: 1, K: 1 });
        expect(edgeNames(payload, "repress")).toEqual(["ProteinA->ProteinB", "ProteinB->ProteinA"].sort());
        expect(payload.nodes.some((n) => n.type === "and")).toBe(false);
        const hills = Object.fromEntries(payload.hillCoefficients.map((h) => [h.id, h.value]));
        expect(hills["ProteinA-ProteinB"]).toBe(3);
        expect(hills["ProteinB-ProteinA"]).toBe(3);
    });

    it("compiles two operators on one promoter through an and node", () => {
        const payload = compileCircuit(PRESETS.andgate.make(), PRESETS.andgate.T);
        expect(payload.proteins.ActA.inputFunctionData.steadyStateValue).toBe(1);
        expect(payload.proteins.ActB.inputFunctionData.steadyStateValue).toBe(1);
        expect(payload.proteins.ActA.K).toBe(1);
        const gate = payload.nodes.find((n) => n.type === "and");
        expect(gate).toBeTruthy();
        const into = payload.edges.filter((e) => e.target === gate?.id);
        expect(into.map((e) => e.type).sort()).toEqual(["promote", "promote"]);
        const out = payload.edges.find((e) => e.source === gate?.id);
        const reporter = payload.nodes.find((n) => n.id === out?.target);
        expect(reporter?.proteinName).toBe("GFP");
        expect(payload.hillCoefficients.map((h) => h.id).sort()).toEqual(["ActA-GFP", "ActB-GFP"]);
    });

    it("sends a single regulator as a direct edge", () => {
        const cs = [
            construct(1, [prom(1), dbd("A", 2), dom("rep", 3)], { name: "R" }),
            construct(2, [op("A", 4), prom(5), fp(0, 6)], { name: "GFP" }),
        ];
        const payload = compileCircuit(cs, 20);
        expect(payload.nodes.some((n) => n.type === "and")).toBe(false);
        expect(edgeNames(payload, "repress")).toEqual(["R->GFP"]);
    });
});
