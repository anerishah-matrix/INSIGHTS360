// Premium, distinct palette using Tailwind-inspired HSL values
const PALETTE = [
  { h: 221, s: 70, l: 50 }, // Blue
  { h: 142, s: 60, l: 45 }, // Green
  { h: 0, s: 65, l: 55 }, // Red
  { h: 262, s: 60, l: 55 }, // Purple
  { h: 25, s: 85, l: 55 }, // Orange
  { h: 187, s: 70, l: 45 }, // Teal
  { h: 330, s: 70, l: 55 }, // Rose
  { h: 45, s: 85, l: 48 }, // Amber
  { h: 245, s: 50, l: 60 }, // Indigo
  { h: 210, s: 20, l: 50 }, // Slate
];

export function colorForIndex(i, total = 10, alpha = 0.7) {
  const color = PALETTE[i % PALETTE.length];
  return {
    background: `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`,
    border: `hsla(${color.h}, ${color.s}%, ${Math.max(0, color.l - 15)}%, 1)`,
  };
}

export function singleSeriesColor(alpha = 0.7) {
  return colorForIndex(0, 1, alpha);
}
