import { PointerEvent } from "react";
import { BH, brickPath, brickSpec, MONO, Part, PartDraft, TAB } from "./parts";

type Props = {
    part: Part | PartDraft;
    onClick?: () => void;
    onPointerDown?: (event: PointerEvent<SVGSVGElement>) => void;
    hint?: string;
};

export default function Brick({ part, onClick, onPointerDown, hint }: Props) {
    const s = brickSpec(part);
    const interactive = Boolean(onClick || onPointerDown);
    return (
        <svg
            width={s.w + TAB}
            height={BH}
            viewBox={`0 0 ${s.w + TAB} ${BH}`}
            onClick={onClick}
            onPointerDown={onPointerDown}
            style={{
                marginRight: -TAB,
                display: "block",
                cursor: onPointerDown ? "grab" : onClick ? "pointer" : "default",
                touchAction: "none",
                flex: "0 0 auto",
            }}
            role={interactive ? "button" : undefined}
            aria-label={hint ? `${s.aria} — ${hint}` : s.aria}
        >
            <path d={brickPath(s.w, s.left, s.right)} fill={s.fill} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
            {part.t === "prom" ? (
                <g stroke="#0c1810" strokeWidth="1.8" fill="none" strokeLinecap="round">
                    <path d="M 12 27 L 12 14 L 24 14" />
                    <path d="M 21 10.5 L 27 14 L 21 17.5" fill="#0c1810" stroke="none" />
                </g>
            ) : (
                <text
                    x={s.w / 2 + 2}
                    y={BH / 2 + (part.t === "dom" ? 6 : 4.5)}
                    textAnchor="middle"
                    fontSize={part.t === "op" ? 14 : part.t === "dom" ? 19 : 11.5}
                    fontWeight="700"
                    fontFamily={part.t === "dbd" || part.t === "fp" ? MONO : "inherit"}
                    fill="#0c1810"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                >
                    {s.label}
                </text>
            )}
        </svg>
    );
}
