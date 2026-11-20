import { construct, Construct, dbd, dom, fp, op, prom, seedIds } from "./parts";

export type Preset = {
    label: string;
    T: number;
    make: () => Construct[];
};

/**
 * Parameters match the canvas templates in
 * src/components/Circuits/repressilator.tsx and toggleSwitch.tsx.
 * Regulatory edges use Hill coefficient 3, the value those templates
 * put on the real connections.
 */
export const PRESETS: Record<string, Preset> = {
    repressilator: {
        label: "Repressilator",
        T: 40,
        make: () => {
            const cs = [
                construct(1, [op("C", 101), prom(102), dbd("A", 103), dom("rep", 104)], { name: "Gene1", gamma: 1, beta: 5, init: 1, basal: 0, K: 1, n: 3 }),
                construct(2, [op("A", 201), prom(202), dbd("B", 203), dom("rep", 204)], { name: "Gene2", gamma: 1, beta: 5, init: 1, basal: 0, K: 1, n: 3 }),
                construct(3, [op("B", 301), prom(302), dbd("C", 303), dom("rep", 304)], { name: "Gene3", gamma: 1, beta: 5, init: 1.2, basal: 0, K: 1, n: 3 }),
            ];
            seedIds(cs);
            return cs;
        },
    },
    toggle: {
        label: "Toggle switch",
        T: 40,
        make: () => {
            const cs = [
                construct(11, [op("B", 1101), prom(1102), dbd("A", 1103), dom("rep", 1104)], { name: "ProteinA", gamma: 0.2, beta: 1, init: 1, basal: 0, K: 1, n: 3 }),
                construct(12, [op("A", 1201), prom(1202), dbd("B", 1203), dom("rep", 1204)], { name: "ProteinB", gamma: 0.2, beta: 1, init: 0, basal: 0, K: 1, n: 3 }),
            ];
            seedIds(cs);
            return cs;
        },
    },
    andgate: {
        label: "AND gate",
        T: 20,
        make: () => {
            const cs = [
                construct(21, [prom(2101), dbd("A", 2102), dom("act", 2103)], { name: "ActA", gamma: 1, beta: 1, init: 1, basal: 1, K: 1, n: 3 }),
                construct(22, [prom(2201), dbd("B", 2202), dom("act", 2203)], { name: "ActB", gamma: 1, beta: 1, init: 1, basal: 1, K: 1, n: 3 }),
                construct(23, [op("A", 2301), op("B", 2302), prom(2303), fp(0, 2304)], { name: "GFP", gamma: 1, beta: 1, init: 0, basal: 0, K: 1, n: 2 }),
            ];
            seedIds(cs);
            return cs;
        },
    },
    blank: { label: "Empty bench", T: 30, make: () => [] },
};
