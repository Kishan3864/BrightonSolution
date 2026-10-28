/**
 * Hand-written responsive SVG/HTML charts for the admin (no chart library). Import from
 * "@/components/admin/charts". Colours: palette.ts (validated categorical order, accent for single
 * series, dashed grey for the previous period).
 */
export { default as BarChart, type BarDatum } from "./BarChart";
export { default as BarList, type BarListRow } from "./BarList";
export { default as ChartTooltip, type TooltipRow } from "./ChartTooltip";
export { default as Donut, type DonutSlice } from "./Donut";
export { default as Funnel, type FunnelStep } from "./Funnel";
export { default as Heatmap } from "./Heatmap";
export { default as Sparkline } from "./Sparkline";
export { default as StackedBar, type StackSegment } from "./StackedBar";
export { default as TimeSeriesChart, type TimePoint, type TimeSeries } from "./TimeSeriesChart";
export { ACCENT, ACCENT_2, PREVIOUS, SERIES, compact, niceTicks, sequential, seriesColor, useWidth } from "./palette";
export { timelinePoints } from "./timeline";
