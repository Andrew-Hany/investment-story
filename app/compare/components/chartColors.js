/**
 * chartColors(dark)
 * 
 * Returns a consistent set of chart colors based on the current theme.
 * Import this in any chart component alongside useTheme().
 * 
 * Usage:
 *   const { dark } = useTheme();
 *   const cc = chartColors(dark);
 *   <line stroke={cc.grid} ... />
 */
export function chartColors(dark) {
  return {
    // SVG grid / axis lines
    grid:       dark ? "#2d3748" : "#f1f5f9",   // slate-700 dark / slate-100 light
    gridStrong: dark ? "#3d4f6a" : "#e2e8f0",   // slightly more visible for solid baseline
    baseline:   dark ? "#4a5568" : "#94a3b8",   // slate-600 dark / slate-400 light
    crosshair:  dark ? "#64748b" : "#94a3b8",   // hover crosshair line

    // Chart canvas background
    canvasBg:   dark ? "#1e2433" : undefined,   // undefined = let Tailwind class handle light

    // Dot stroke (center of the hover dot)
    dotStroke:  dark ? "#1e2433" : "#ffffff",

    // SVG value label text (shown above dots)
    textLabel: dark ? "#e2e8f0" : "#1e293b",   // slate-200 dark / slate-900 light

    // Brand lines (unchanged — these look great on both)
    lineA:   "#3b82f6",   // blue-500
    lineB:   "#7c3aed",   // violet-600
    lineC:   "#10b981",   // emerald-500 (FX rate)
    lineRed: "#ef4444",   // red-500 (danger / FCF negative)

    // Gradient fill opacities
    fillOpacityA: dark ? "0.14" : "0.08",
    fillOpacityB: dark ? "0.14" : "0.08",
  };
}
