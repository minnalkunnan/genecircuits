import { canAppend, ONE_OPERATOR, op, prom, secondOperatorRefusal } from "../parts";

describe("one operator per construct", () => {
    test("an operator can start a construct and be followed by a promoter", () => {
        expect(canAppend([], "op")).toBe(true);
        expect(canAppend([op("A", 1)], "prom")).toBe(true);
        expect(secondOperatorRefusal([op("A", 1)], "prom")).toBeNull();
    });

    test("a second operator cannot be chained onto the same construct", () => {
        const parts = [op("A", 1)];
        expect(canAppend(parts, "op")).toBe(false);
        expect(secondOperatorRefusal(parts, "op")).toBe(ONE_OPERATOR);
        expect(secondOperatorRefusal([op("A", 1), prom(2)], "op")).toBe(ONE_OPERATOR);
    });
});
