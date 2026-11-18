import { useCallback } from "react";
import type { UseReplayReturn } from "../../hooks/useReplay";

interface Props {
  replay: UseReplayReturn;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

function formatTime(ts: number): string {
  if (ts === 0) return "--:--:--";
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
}

export function ReplayControls({ replay }: Props) {
  const { engine, clock, state, speed, progress, time } = replay;

  const timeRange = engine.getTimeRange();
  const startTime = timeRange?.start ?? 0;
  const endTime = timeRange?.end ?? 0;

  const handlePlayPause = useCallback(() => {
    if (state === "playing") {
      engine.pause();
    } else {
      engine.play();
    }
  }, [state, engine]);

  const handleStop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const handleSeekStart = useCallback(() => {
    engine.seek(startTime);
  }, [engine, startTime]);

  const handleSeekEnd = useCallback(() => {
    engine.seek(endTime);
  }, [engine, endTime]);

  const handleCycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    engine.setSpeed(next);
  }, [speed, engine]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekTime = startTime + frac * (endTime - startTime);
      engine.seek(seekTime);
    },
    [engine, startTime, endTime],
  );

  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
      {/* Transport buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSeekStart}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Go to start (Home)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 4v8H3V4h1zm1.7 4l5.3 4V4l-5.3 4z" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title={state === "playing" ? "Pause (Space)" : "Play (Space)"}
        >
          {state === "playing" ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 3h2v10H5V3zm4 0h2v10H9V3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleStop}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Stop (Escape)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <rect x="3" y="3" width="10" height="10" />
          </svg>
        </button>

        <button
          onClick={handleSeekEnd}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="Go to end (End)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5 4l5.3 4L5 12V4zm7 0v8h-1V4h1z" />
          </svg>
        </button>
      </div>

      {/* Speed */}
      <button
        onClick={handleCycleSpeed}
        className="text-xs font-mono px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors min-w-[3rem] text-center"
        title="Click to cycle speed"
      >
        {speed}x
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(progress * 100).toFixed(1)}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${(progress * 100).toFixed(1)}% - 6px)` }}
        />
      </div>

      {/* Time display */}
      <span className="text-xs font-mono text-gray-300 min-w-[6rem] text-right">
        {formatTime(time)}
      </span>
    </div>
  );
}
