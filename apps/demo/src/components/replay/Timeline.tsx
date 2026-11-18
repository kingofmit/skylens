import { useMemo, useCallback } from "react";
import type { UseReplayReturn } from "../../hooks/useReplay";

interface Props {
  replay: UseReplayReturn;
}

const EVENT_COLORS: Record<string, string> = {
  phase_change: "#3b82f6",
  flightdna_anomaly: "#ef4444",
  default: "#9ca3af",
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
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 font-mono">{formatTime(startTime)}</span>
        <span className="text-[10px] text-gray-400 font-semibold uppercase">Timeline</span>
        <span className="text-[10px] text-gray-500 font-mono">{formatTime(endTime)}</span>
      </div>

      {/* Timeline bar */}
      <div
        className="relative h-6 bg-gray-700 rounded cursor-pointer"
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
              style={{ left: `${(frac * 100).toFixed(2)}%`, backgroundColor: color }}
              title={`${evt.label} (${formatTime(evt.time)})`}
            />
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-sm"
          style={{ left: `${(progress * 100).toFixed(2)}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
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
                style={{ backgroundColor: color }}
              />
              {type.replace(/_/g, " ")}
            </span>
          ))}
      </div>
    </div>
  );
}
