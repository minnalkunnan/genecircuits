import { SimulationData } from "../types/SimulationResponse";

const SVG_WIDTH = 960;
const SVG_HEIGHT = 560;
const PADDING = {
  top: 28,
  right: 32,
  bottom: 92,
  left: 64,
};

const SERIES_COLORS = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
];

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function createSimulationChartSvg(data: SimulationData): string {
  const chartWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const timePoints = data.timePoints;
  const concentrations = data.concentrations;
  const flatValues = concentrations.flat();
  const minY = Math.min(0, ...flatValues);
  const maxY = Math.max(1, ...flatValues);
  const yRange = Math.max(1e-9, maxY - minY);
  const minX = timePoints[0] ?? 0;
  const maxX = timePoints[timePoints.length - 1] ?? 1;
  const xRange = Math.max(1e-9, maxX - minX);

  const scaleX = (value: number) =>
    PADDING.left + ((value - minX) / xRange) * chartWidth;
  const scaleY = (value: number) =>
    PADDING.top + chartHeight - ((value - minY) / yRange) * chartHeight;

  const yTicks = Array.from({ length: 5 }, (_, index) => minY + (yRange * index) / 4);
  const xTicks = Array.from({ length: 6 }, (_, index) => minX + (xRange * index) / 5);

  const gridLines = [
    ...yTicks.map((tick) => {
      const y = scaleY(tick);
      return `
        <line x1="${PADDING.left}" y1="${y}" x2="${SVG_WIDTH - PADDING.right}" y2="${y}" stroke="#dbe4f0" stroke-width="1" />
        <text x="${PADDING.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="#64748b">${tick.toFixed(2)}</text>
      `;
    }),
    ...xTicks.map((tick) => {
      const x = scaleX(tick);
      return `
        <line x1="${x}" y1="${PADDING.top}" x2="${x}" y2="${PADDING.top + chartHeight}" stroke="#eef2f7" stroke-width="1" />
        <text x="${x}" y="${PADDING.top + chartHeight + 24}" text-anchor="middle" font-size="12" fill="#64748b">${tick.toFixed(1)}</text>
      `;
    }),
  ].join("");

  const paths = data.proteinNames
    .map((proteinName, proteinIndex) => {
      const color = SERIES_COLORS[proteinIndex % SERIES_COLORS.length];
      const path = timePoints
        .map((timePoint, timeIndex) => {
          const row = concentrations[timeIndex] ?? [];
          const concentration = row[proteinIndex] ?? 0;
          const x = scaleX(timePoint);
          const y = scaleY(concentration);
          return `${timeIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

      return `
        <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      `;
    })
    .join("");

  const legend = data.proteinNames
    .map((proteinName, proteinIndex) => {
      const color = SERIES_COLORS[proteinIndex % SERIES_COLORS.length];
      const column = proteinIndex % 3;
      const row = Math.floor(proteinIndex / 3);
      const x = PADDING.left + column * 230;
      const y = SVG_HEIGHT - 44 + row * 22;

      return `
        <line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="${color}" stroke-width="4" stroke-linecap="round" />
        <text x="${x + 32}" y="${y + 4}" font-size="13" fill="#1e293b">${escapeXml(proteinName)}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Simulation output chart">
      <rect width="100%" height="100%" fill="#f8fafc" rx="16" />
      <rect x="${PADDING.left}" y="${PADDING.top}" width="${chartWidth}" height="${chartHeight}" fill="#ffffff" stroke="#dbe4f0" stroke-width="1.5" rx="12" />
      ${gridLines}
      <line x1="${PADDING.left}" y1="${PADDING.top + chartHeight}" x2="${SVG_WIDTH - PADDING.right}" y2="${PADDING.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${PADDING.top + chartHeight}" stroke="#94a3b8" stroke-width="1.5" />
      ${paths}
      <text x="${SVG_WIDTH / 2}" y="${SVG_HEIGHT - 18}" text-anchor="middle" font-size="14" fill="#475569">Time</text>
      <text x="18" y="${SVG_HEIGHT / 2}" text-anchor="middle" font-size="14" fill="#475569" transform="rotate(-90 18 ${SVG_HEIGHT / 2})">Concentration</text>
      ${legend}
    </svg>
  `.trim();
}
