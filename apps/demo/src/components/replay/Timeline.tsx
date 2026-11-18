import { useMemo, useCallback } from "react";
import type { UseReplayReturn } from "../../hooks/useReplay";

interface Props {
  replay: UseReplayReturn;
}

const EVENT_COLORS: Record<string, string> = {
  phase_change: "#00e5ff",
  flightdna_anomaly: "#ff5252",
  default: "#6b7280",
};

function formatTime(ts: number): string {
  if (ts === 0) return "--:--";
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function Timeline({ replay }: Props) {
  const { engine, timeline, time, progress } = replay;

  const timeRange = engine.getTimeRange();
  const startTime = timeRange?.start ?? 0;
  const endTime = timeRange?.end ?? 0;
  const rangeDuration = endTime - startTime;

  const events = useMemo(() => timeline.getAllEvents(), [timeline, time]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekTime = startTime + frac * rangeDuration;
      engine.seek(seekTime);
    },
    [engine, startTime, rangeDuration],
  );

  return (
    <div className="glass rounded-lg px-3 py-2 border border-cyan-500/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 font-mono">{formatTime(startTime)}</span>
        <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Timeline</span>
        <span className="text-[10px] text-gray-500 font-mono">{formatTime(endTime)}</span>
      </div>

      {/* Timeline bar */}
      <div
        className="relative h-6 bg-white/5 rounded cursor-pointer border border-cyan-500/10"
        onClick={handleClick}
      >
        {/* Event markers */}
        {events.map((evt, i) => {
          if (rangeDuration <= 0) return null;
          const frac = (evt.time - startTime) / rangeDuration;
          if (frac < 0 || frac > 1) return null;
          const color = EVENT_COLORS[evt.type] ?? EVENT_COLORS.default;
          return (
            <div
              key={i}
              className="absolute top-1 w-2 h-2 -translate-x-1/2 rotate-45"
              style={{
                left: `${(frac * 100).toFixed(2)}%`,
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
              }}
              title={`${evt.label} (${formatTime(evt.time)})`}
            />
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400/80 shadow-sm"
          style={{ left: `${(progress * 100).toFixed(2)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(0,229,255,0.5)]" />
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1">
        {Object.entries(EVENT_COLORS)
          .filter(([k]) => k !== "default")
          .map(([type, color]) => (
            <span key={type} className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <span
                className="w-2 h-2 rotate-45 inline-block"
                style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
              />
              {type.replace(/_/g, " ")}
            </span>
          ))}
      </div>
    </div>
  );
}
