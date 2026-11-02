import { CSSProperties, PointerEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runSimulation } from "../api/backendClient.web";
import { analyse } from "./analyse";
import Brick from "./Brick";
import { compileCircuit } from "./compile";
import {
    BH,
    canAppend,
    Construct,
    construct,
    FPS,
    LC,
    LETTERS,
    MONO,
    nid,
    Part,
    PartDraft,
    seedIds,
    startsOK,
} from "./parts";
import { PRESETS } from "./presets";
import { buildScene, SCENE_H, SCENE_W } from "./scene";

const INK = "#e7ede7";
const MUT = "#8a968c";
const FIELD = "#0f1512";
const PANEL = "#151d18";
const SUNK = "#101713";
const LINE = "#26312a";
const AMBER = "#f0a442";
const GO = "#4ade80";

const CELLS = [
    { x: 72, y: 52, a: -17 }, { x: 168, y: 40, a: 11 }, { x: 246, y: 76, a: -41 },
    { x: 58, y: 128, a: 27 }, { x: 152, y: 118, a: -7 }, { x: 240, y: 156, a: 19 },
    { x: 106, y: 182, a: -31 }, { x: 205, y: 205, a: 8 },
];

type SimSeries = { names: string[]; time: number[]; values: number[][] };

function hex2rgb(h: string): [number, number, number] {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function Btn({ children, onClick, tone = "quiet", style }: { children: ReactNode; onClick: () => void; tone?: "quiet" | "go" | "on" | "warn"; style?: CSSProperties }) {
    return (
        <button type="button" onClick={onClick} style={{
            background: tone === "go" ? GO : tone === "on" ? "#1e2b23" : "transparent",
            color: tone === "go" ? "#0a2213" : tone === "warn" ? "#e8879c" : INK,
            border: `1px solid ${tone === "go" ? GO : tone === "warn" ? "#5a3540" : LINE}`,
            borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", ...style,
        }}>{children}</button>
    );
}

function Slider({ label, value, min, max, log, step, onChange, fmt }: {
    label: string; value: number; min: number; max: number; log?: boolean; step?: number;
    onChange: (v: number) => void; fmt: (v: number) => string;
}) {
    const toS = (v: number) => (log ? (Math.log(Math.max(v, min)) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min));
    const fromS = (s: number) => (log ? Math.exp(Math.log(min) + s * (Math.log(max) - Math.log(min))) : min + s * (max - min));
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: MUT, marginBottom: 2 }}>
                <span>{label}</span><span style={{ color: INK, fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</span>
            </div>
            <input type="range" min={0} max={1} step={step ?? 0.001} value={toS(value)}
                onChange={(e) => onChange(fromS(parseFloat(e.target.value)))} style={{ width: "100%", accentColor: GO }} aria-label={label} />
        </div>
    );
}

const palette: { head: string; items: PartDraft[] }[] = [
    { head: "Operators", items: LETTERS.map((L) => ({ t: "op", L })) },
    { head: "Minimal promoter", items: [{ t: "prom" }] },
    { head: "DNA-binding domains", items: LETTERS.map((L) => ({ t: "dbd", L })) },
    { head: "Effector domains", items: [{ t: "dom", pol: "act" }, { t: "dom", pol: "rep" }] },
    { head: "Fluorophores", items: FPS.map((f) => ({ t: "fp", ...f })) },
];

export default function BrickBench() {
    const [key, setKey] = useState("repressilator");
    const [cons, setCons] = useState<Construct[]>(() => PRESETS.repressilator.make());
    const [T, setT] = useState(PRESETS.repressilator.T);
    const [selId, setSelId] = useState<number | null>(null);
    const [draftId, setDraftId] = useState<number | null>(null);
    const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
    const [frac, setFrac] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [drag, setDrag] = useState<{ part: PartDraft; x: number; y: number } | null>(null);
    const [channel, setChannel] = useState("merge");
    const [gain, setGain] = useState(1.4);
    const [sim, setSim] = useState<SimSeries | null>(null);
    const [simError, setSimError] = useState<string | null>(null);
    const raf = useRef<number | null>(null);
    const dragRef = useRef<{ part: PartDraft; sx: number; sy: number; moved: boolean } | null>(null);

    const an = useMemo(() => analyse(cons), [cons]);
    const payload = useMemo(() => compileCircuit(cons, T), [cons, T]);
    const scene = useMemo(() => buildScene(an.info, an.edges, an.incoherent), [an]);

    const names = sim?.names ?? [];
    const pts = sim?.time.length ?? 0;
    const tIdx = pts ? Math.min(pts - 1, Math.round(frac * (pts - 1))) : 0;
    const timeNow = pts && sim ? sim.time[tIdx] : 0;
    const yMax = useMemo(() => {
        if (!sim) return 1;
        let m = 1;
        for (const row of sim.values) for (const v of row) if (v > m) m = v;
        return m;
    }, [sim]);
    const levelOf = (name: string | undefined) => {
        if (!sim || !name) return 0;
        const i = names.indexOf(name);
        if (i < 0) return 0;
        return Math.max(0, sim.values[tIdx]?.[i] ?? 0);
    };

    const nameById = useMemo(() => {
        const map = new Map<number, string>();
        for (const node of payload.nodes) {
            if (node.proteinName && node.id.startsWith("p")) map.set(Number(node.id.slice(1)), node.proteinName);
        }
        return map;
    }, [payload]);
    const channels = useMemo(() => {
        const m = new Map<string, { name: string; color: string; proteins: string[] }>();
        an.info.forEach((x) => {
            if (!x.fluor || !x.hasProm || x.gap) return;
            const protein = nameById.get(x.c.id);
            if (!protein) return;
            const existing = m.get(x.fluor.name);
            if (existing) existing.proteins.push(protein);
            else m.set(x.fluor.name, { name: x.fluor.name, color: x.fluor.color, proteins: [protein] });
        });
        return [...m.values()];
    }, [an, nameById]);

    useEffect(() => {
        if (channels.length && channel !== "merge" && !channels.some((c) => c.name === channel)) setChannel("merge");
    }, [channels, channel]);
    const shown = channel === "merge" ? channels : channels.filter((c) => c.name === channel);

    useEffect(() => {
        let cancelled = false;
        if (!payload.nodes.length) {
            setSim(null);
            setSimError(null);
            return;
        }
        runSimulation(payload).then((res) => {
            if (cancelled) return;
            if (!res?.ok || !res.data) {
                setSim(null);
                setSimError(res?.error || res?.message || "Simulation did not return a curve.");
                return;
            }
            setSimError(null);
            setSim({
                names: res.data.proteinNames,
                time: res.data.timePoints,
                values: res.data.concentrations,
            });
        }).catch((err: Error) => {
            if (!cancelled) {
                setSim(null);
                setSimError(err.message || "Could not reach the simulator.");
            }
        });
        return () => { cancelled = true; };
    }, [payload]);

    useEffect(() => {
        if (!playing) {
            if (raf.current) cancelAnimationFrame(raf.current);
            return;
        }
        let last = performance.now();
        const tick = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;
            setFrac((f) => (f + dt / Math.max(T, 1)) % 1);
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [playing, T]);

    const load = (k: string) => {
        const preset = PRESETS[k];
        const made = preset.make();
        setCons(made);
        setOpenIds(new Set());
        setDraftId(null);
        setT(preset.T);
        setKey(k);
        setSelId(null);
        setFrac(0);
        setPlaying(true);
        setChannel("merge");
    };
    const toggleOpen = (id: number) => {
        setOpenIds((ids) => {
            const next = new Set(ids);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setSelId(id);
    };

    const appendTo = useCallback((cid: number, part: PartDraft) => {
        setCons((cs) => cs.map((c) => (c.id === cid && canAppend(c.parts, part.t) ? { ...c, parts: [...c.parts, { ...part, id: nid() } as Part] } : c)));
    }, []);
    const newWith = useCallback((part: PartDraft) => {
        if (!startsOK(part.t)) return false;
        const c = construct(nid(), [{ ...part, id: nid() } as Part]);
        seedIds([c]);
        setCons((cs) => [...cs, c]);
        setSelId(c.id);
        setDraftId(c.id);
        return true;
    }, []);
    const dropNew = useCallback((part: PartDraft) => {
        const d = cons.find((c) => c.id === draftId);
        if (d && canAppend(d.parts, part.t)) { appendTo(d.id, part); setSelId(d.id); }
        else newWith(part);
    }, [cons, draftId, appendTo, newWith]);
    const tapPart = (part: PartDraft) => {
        const target = cons.find((c) => c.id === selId);
        if (target && canAppend(target.parts, part.t)) appendTo(target.id, part);
        else if (!newWith(part)) {
            const fit = cons.find((c) => canAppend(c.parts, part.t));
            if (fit) { appendTo(fit.id, part); setSelId(fit.id); }
        }
    };
    const removePart = (cid: number, pid: number) => setCons((cs) => cs.map((c) => {
        if (c.id !== cid) return c;
        const next = c.parts.filter((p) => p.id !== pid);
        for (let j = 1; j < next.length; j++) if (!canAppend(next.slice(0, j), next[j].t)) return c;
        if (next.length && !startsOK(next[0].t)) return c;
        return { ...c, parts: next };
    }).filter((c) => c.parts.length > 0));

    const startDrag = (part: PartDraft) => (e: PointerEvent<SVGSVGElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { part, sx: e.clientX, sy: e.clientY, moved: false };
        setDrag({ part, x: e.clientX, y: e.clientY });
    };
    useEffect(() => {
        if (!drag) return;
        const move = (e: globalThis.PointerEvent) => {
            const d = dragRef.current;
            if (d && (Math.abs(e.clientX - d.sx) > 5 || Math.abs(e.clientY - d.sy) > 5)) d.moved = true;
            setDrag((s) => (s ? { ...s, x: e.clientX, y: e.clientY } : s));
        };
        const up = (e: globalThis.PointerEvent) => {
            const d = dragRef.current;
            dragRef.current = null;
            setDrag(null);
            if (!d) return;
            if (!d.moved) { tapPart(d.part); return; }
            const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-drop]");
            if (!zone) return;
            const cid = zone.getAttribute("data-drop");
            if (cid === "new") dropNew(d.part);
            else if (cid) { appendTo(Number(cid), d.part); setSelId(Number(cid)); }
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [drag, cons, selId, draftId, appendTo, newWith, dropNew]);

    const patch = (id: number, partial: Partial<Construct>) => setCons((cs) => cs.map((z) => z.id === id ? { ...z, ...partial } : z));

    const PW = 540, PH = 320, PL = 40, PB = 28, PT = 14, PR = 14;
    const px = (t: number) => PL + (T ? (t / T) * (PW - PL - PR) : 0);
    const py = (v: number) => PH - PB - (Math.min(v, yMax) / yMax) * (PH - PB - PT);

    const field = (() => {
        let r = 0, g = 0, b = 0, tot = 0;
        for (const ch of shown) {
            let v = 0;
            for (const protein of ch.proteins) v += levelOf(protein);
            v = Math.max(0, v) * gain;
            tot += v;
            const [cr, cg, cb] = hex2rgb(ch.color);
            r += cr * v; g += cg * v; b += cb * v;
        }
        return { css: `rgb(${Math.min(255, r | 0)},${Math.min(255, g | 0)},${Math.min(255, b | 0)})`, tot };
    })();

    return (
        <div className="bottom-container" style={{ background: FIELD, color: INK, overflow: "auto" }}>
            <style>{`
                .brick-bench button:focus-visible,.brick-bench input:focus-visible,.brick-bench select:focus-visible{outline:2px solid ${GO};outline-offset:2px}
            `}</style>
            <div className="brick-bench" style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 14px 40px", width: "100%" }}>
                {drag && (
                    <div style={{ position: "fixed", left: drag.x, top: drag.y, transform: "translate(-30%,-50%)", pointerEvents: "none", zIndex: 50, filter: "drop-shadow(0 6px 10px rgba(0,0,0,.5))" }}>
                        <Brick part={drag.part} />
                    </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 500, margin: 0, fontFamily: "Georgia, serif" }}>Brick Bench</h1>
                    <span style={{ fontSize: 12.5, color: MUT }}>snap the parts — the wiring follows</span>
                    <select value={key} onChange={(e) => load(e.target.value)}
                        style={{ marginLeft: "auto", background: PANEL, color: INK, border: `1px solid ${LINE}`, borderRadius: 7, padding: "7px 10px", fontSize: 13 }} aria-label="Load circuit">
                        {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                    </select>
                </div>

                <aside aria-label="Parts" style={{
                    display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "flex-start",
                    background: SUNK, border: `1px solid ${LINE}`, borderRadius: 10, padding: "9px 11px 11px", marginBottom: 12,
                }}>
                    {palette.map((grp) => (
                        <div key={grp.head}>
                            <div style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{grp.head}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                                {grp.items.map((p, i) => <Brick key={grp.head + i} part={p} onPointerDown={startDrag(p)} hint="drag or tap to add" />)}
                            </div>
                        </div>
                    ))}
                    <div style={{ flexBasis: "100%", fontSize: 11, color: MUT }}>drag onto a gene, or tap to add</div>
                </aside>

                <div style={{ marginBottom: 14 }}>
                    {(() => {
                        const dx = an.info.find((x) => x.c.id === draftId);
                        const canGrow = drag && dx ? canAppend(dx.c.parts, drag.part.t) : false;
                        const canStart = drag ? startsOK(drag.part.t) : false;
                        const hot = drag && (canGrow || (!dx && canStart) || (dx && canStart));
                        return (
                            <div data-drop="new" style={{
                                border: `1px dashed ${hot ? GO : LINE}`, borderRadius: 10, marginBottom: 8,
                                padding: dx ? "9px 10px 10px" : "13px 10px", textAlign: dx ? "left" : "center",
                                fontSize: 12, color: hot ? GO : MUT, background: dx ? SUNK : "transparent",
                            }}>
                                {!dx && "drop an operator or promoter here to start a new construct"}
                                {dx && (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 99, background: dx.color }} />
                                            <span style={{ fontSize: 12.5, fontFamily: MONO, color: INK }}>{dx.full}</span>
                                            {dx.gap && <span style={{ fontSize: 11, color: AMBER }}>keep adding parts</span>}
                                            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                                <Btn tone="go" onClick={() => setDraftId(null)}>Add to circuit</Btn>
                                                <Btn tone="warn" onClick={() => { setCons((cs) => cs.filter((z) => z.id !== dx.c.id)); setDraftId(null); setSelId(null); }}>Discard</Btn>
                                            </span>
                                        </div>
                                        <div style={{ position: "relative" }}>
                                            <div style={{ position: "absolute", left: 4, right: 4, top: BH / 2, height: 1, background: LINE }} />
                                            <div style={{ display: "flex", alignItems: "center", position: "relative", overflowX: "auto", paddingBottom: 2 }}>
                                                {dx.c.parts.map((p) => <Brick key={p.id} part={p} onClick={() => removePart(dx.c.id, p.id)} hint="tap to remove" />)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 11, color: MUT, marginTop: 4 }}>drag more parts here to keep building, then tap Add to circuit</div>
                                    </>
                                )}
                            </div>
                        );
                    })()}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                        {an.info.filter((x) => x.c.id !== draftId).map((x) => {
                            const c = x.c;
                            const on = selId === c.id;
                            const isOpen = openIds.has(c.id);
                            const lit = levelOf(nameById.get(c.id));
                            const fits = drag ? canAppend(c.parts, drag.part.t) : false;
                            return (
                                <div key={c.id} data-drop={c.id} style={{
                                    flex: "1 1 280px", background: PANEL, borderRadius: 10, padding: "8px 10px",
                                    border: `1px ${drag ? "dashed" : "solid"} ${drag ? (fits ? GO : LINE) : on ? "#3a4a40" : LINE}`,
                                    opacity: drag && !fits ? 0.5 : 1,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} coefficients for ${c.name || x.full}`}
                                            onClick={() => toggleOpen(c.id)}
                                            style={{ background: "transparent", border: "none", color: INK, cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>
                                            {isOpen ? "▾" : "▸"}
                                        </button>
                                        <span onClick={() => setSelId(c.id)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 99, background: x.color, boxShadow: lit > yMax * 0.5 ? `0 0 8px ${x.color}` : "none" }} />
                                            <span style={{ fontSize: 12.5, fontFamily: MONO }}>{c.name ? `${c.name}  ${x.full}` : x.full}</span>
                                        </span>
                                        {x.gap && <span style={{ fontSize: 11, color: AMBER }}>incomplete</span>}
                                        <span style={{ marginLeft: "auto", fontSize: 11, color: MUT, fontVariantNumeric: "tabular-nums" }}>{nameById.has(c.id) ? lit.toFixed(2) : ""}</span>
                                    </div>
                                    <div style={{ position: "relative" }}>
                                        <div style={{ position: "absolute", left: 4, right: 4, top: BH / 2, height: 1, background: LINE }} />
                                        <div style={{ display: "flex", alignItems: "center", position: "relative", overflowX: "auto", paddingBottom: 2 }}>
                                            {c.parts.map((p) => <Brick key={p.id} part={p} onClick={() => removePart(c.id, p.id)} hint="tap to remove" />)}
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${LINE}` }}>
                                            <div style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Coefficients</div>
                                            {x.product?.kind === "tf" && (
                                                <Slider label="Hill coefficient n" value={c.n} min={1} max={8} step={1 / 7} onChange={(v) => patch(c.id, { n: Math.round(v) })} fmt={(v) => `n = ${Math.round(v)}`} />
                                            )}
                                            <Slider label="Production rate β" value={c.beta} min={0.05} max={10} log onChange={(v) => patch(c.id, { beta: v })} fmt={(v) => `β = ${v.toFixed(2)}`} />
                                            <Slider label="Degradation rate γ" value={c.gamma} min={0.05} max={2} log onChange={(v) => patch(c.id, { gamma: v })} fmt={(v) => `γ = ${v.toFixed(2)}`} />
                                            <Slider label="Basal leak" value={c.basal} min={0} max={2} onChange={(v) => patch(c.id, { basal: v })} fmt={(v) => v.toFixed(2)} />
                                            <Slider label="Initial concentration" value={c.init} min={0} max={5} onChange={(v) => patch(c.id, { init: v })} fmt={(v) => v.toFixed(2)} />
                                            {x.product?.kind === "tf" && (
                                                <Slider label="Dissociation constant K" value={c.K} min={0.05} max={2} log onChange={(v) => patch(c.id, { K: v })} fmt={(v) => `K = ${v.toFixed(2)}`} />
                                            )}
                                            <Btn tone="warn" onClick={() => { setCons((cs) => cs.filter((z) => z.id !== c.id)); setSelId(null); }}>Discard construct</Btn>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))", gap: 14, alignItems: "start" }}>
                    <div style={{ minWidth: 0, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Wiring</div>
                        <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                            {scene.arrows.map((a) => (
                                <g key={a.id}>
                                    <path d={a.d} fill="none" stroke={a.color} strokeWidth={1.6 + 0.7 * (a.mult - 1)} opacity={0.9} />
                                    {a.pol === "rep"
                                        ? <line x1={a.x1 - a.tpx * 7} y1={a.y1 - a.tpy * 7} x2={a.x1 + a.tpx * 7} y2={a.y1 + a.tpy * 7} stroke={a.color} strokeWidth="2.8" strokeLinecap="round" />
                                        : <path d={`M ${a.x1 + a.tux * 8} ${a.y1 + a.tuy * 8} L ${a.x1 - a.tpx * 5.5} ${a.y1 - a.tpy * 5.5} L ${a.x1 + a.tpx * 5.5} ${a.y1 + a.tpy * 5.5} Z`} fill={a.color} />}
                                    {!a.self && a.mult > 1 && (
                                        <text x={a.mx} y={a.my + 3.5} textAnchor="middle" fontSize="10" fontFamily={MONO} fill={a.incoherent ? AMBER : MUT}
                                            style={{ paintOrder: "stroke", stroke: PANEL, strokeWidth: 3 }}>×{a.mult}</text>
                                    )}
                                </g>
                            ))}
                            {scene.nodes.map((node) => {
                                const lit = levelOf(nameById.get(node.id));
                                const glow = yMax > 0 ? Math.min(1, lit / yMax) : 0;
                                const stripe = node.sites;
                                const segH = node.h / stripe.length;
                                return (
                                    <g key={node.id} onClick={() => setSelId(selId === node.id ? null : node.id)} style={{ cursor: "pointer" }}>
                                        <rect x={node.x - node.w / 2} y={node.y - node.h / 2} width={node.w} height={node.h} rx={5}
                                            fill={node.color} opacity={0.18 + 0.55 * glow}
                                            stroke={selId === node.id ? GO : node.color} strokeWidth={selId === node.id ? 2.2 : 1.1}
                                            strokeDasharray={node.gap ? "4 3" : "none"} />
                                        {stripe.map((L, si) => (
                                            <rect key={si} x={node.x - node.w / 2} y={node.y - node.h / 2 + si * segH} width={7} height={segH}
                                                fill={L ? LC[L as keyof typeof LC] : "#6d786f"} rx={2} />
                                        ))}
                                        <text x={node.x + 4} y={node.y + 4} textAnchor="middle" fontSize="10" fontFamily={MONO} fontWeight="600"
                                            fill={INK} style={{ pointerEvents: "none" }}>{node.label}</text>
                                    </g>
                                );
                            })}
                        </svg>
                        <div style={{ borderLeft: `3px solid ${GO}`, paddingLeft: 10, marginTop: 8 }}>
                            <div style={{ fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.35 }}>{an.main}</div>
                            {an.notes.map((n, i) => <div key={i} style={{ fontSize: 11.5, color: n.tone === "warn" ? AMBER : MUT, marginTop: 4, lineHeight: 1.4 }}>{n.text}</div>)}
                            {simError && <div style={{ fontSize: 11.5, color: AMBER, marginTop: 6 }}>{simError}</div>}
                        </div>
                    </div>
                    <div style={{ minWidth: 0, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Results</div>
                        <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: "100%", height: "auto", display: "block" }}>
                                {[0, yMax / 2, yMax].map((v) => (
                                    <g key={v}>
                                        <line x1={PL} y1={py(v)} x2={PW - PR} y2={py(v)} stroke={LINE} strokeWidth="0.6" />
                                        <text x={PL - 8} y={py(v) + 4} textAnchor="end" fontSize="13" fill={MUT}>{v >= 10 ? v.toFixed(0) : v.toFixed(1)}</text>
                                    </g>
                                ))}
                                {sim && an.info.map((x) => {
                                    const i = names.indexOf(nameById.get(x.c.id) ?? "");
                                    if (i < 0) return null;
                                    let d = "";
                                    for (let p = 0; p < sim.time.length; p++) d += (p ? "L" : "M") + px(sim.time[p]).toFixed(1) + " " + py(sim.values[p][i]).toFixed(1);
                                    return <path key={x.c.id} d={d} fill="none" stroke={x.color} strokeWidth={x.product?.kind === "reporter" ? 3.2 : 2.2}
                                        opacity={selId ? (selId === x.c.id ? 1 : 0.3) : 0.95} />;
                                })}
                                {pts > 0 && <line x1={px(timeNow)} y1={PT} x2={px(timeNow)} y2={PH - PB} stroke={INK} strokeWidth="1.2" opacity={0.7} />}
                            </svg>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px 6px" }}>
                                <Btn tone={playing ? "go" : "quiet"} onClick={() => setPlaying((p) => !p)} style={{ minWidth: 60, textAlign: "center" }}>{playing ? "Pause" : "Play"}</Btn>
                                <input type="range" min={0} max={1} step={0.002} value={frac} onChange={(e) => { setPlaying(false); setFrac(parseFloat(e.target.value)); }}
                                    style={{ flex: 1, accentColor: GO }} aria-label="Time cursor" />
                                <span style={{ fontSize: 11, color: MUT, fontVariantNumeric: "tabular-nums", minWidth: 50, textAlign: "right" }}>t = {timeNow.toFixed(1)}</span>
                            </div>
                        <div style={{ padding: "0 4px" }}>
                            <Slider label="Simulation length T" value={T} min={5} max={160} onChange={(v) => setT(Math.round(v))} fmt={(v) => `${Math.round(v)}`} />
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: 0.6, marginRight: 2 }}>Channel</span>
                            {channels.length > 1 && <Btn tone={channel === "merge" ? "on" : "quiet"} onClick={() => setChannel("merge")}>Merge</Btn>}
                            {channels.map((c) => (
                                <Btn key={c.name} tone={channel === c.name ? "on" : "quiet"} onClick={() => setChannel(c.name)}
                                    style={{ borderColor: channel === c.name ? c.color : LINE, color: channel === c.name ? c.color : INK }}>{c.name}</Btn>
                            ))}
                            {channels.length === 0 && <span style={{ fontSize: 11.5, color: MUT }}>no fluorophore in this circuit</span>}
                        </div>
                        <svg viewBox="0 0 300 230" style={{ width: "100%", maxWidth: 300, height: "auto", display: "block", borderRadius: 8, background: "#05080a" }}>
                            {CELLS.map((cell, ci) => {
                                const { css, tot } = field;
                                const a = channels.length ? Math.min(1, tot * 0.35) : 0;
                                return (
                                    <g key={ci} transform={`translate(${cell.x} ${cell.y}) rotate(${cell.a})`}>
                                        <rect x={-23} y={-7.5} width={46} height={15} rx={7.5} fill={channels.length ? css : "#1a2420"} opacity={channels.length ? 0.15 + 0.85 * a : 0.9} />
                                        <rect x={-23} y={-7.5} width={46} height={15} rx={7.5} fill="none" stroke="#4a5a55" strokeWidth=".8" opacity=".55" />
                                    </g>
                                );
                            })}
                            <text x="10" y="17" fontSize="10.5" fontFamily={MONO} fill={channel === "merge" ? MUT : (channels.find((c) => c.name === channel)?.color || MUT)}>
                                {channels.length ? (channel === "merge" ? "merge" : channel) : "brightfield"}
                            </text>
                            <text x="290" y="17" textAnchor="end" fontSize="10.5" fontFamily={MONO} fill={MUT}>t = {timeNow.toFixed(1)}</text>
                        </svg>
                        <div style={{ padding: "8px 2px 0", maxWidth: 300 }}>
                            <Slider label="Gain" value={gain} min={0.4} max={3.5} log onChange={setGain} fmt={(v) => `${v.toFixed(1)}×`} />
                        </div>
                        </div>
                    </div>
                </div>
                <div style={{ fontSize: 12, color: MUT, lineHeight: 1.55, marginTop: 12, maxWidth: 740 }}>
                    The trace and the field share one time cursor and one trajectory from the simulator. A gene with no regulators sits at its basal level. Raising γ on a regulated gene lowers its steady concentration toward that basal level.
                </div>
            </div>
        </div>
    );
}
