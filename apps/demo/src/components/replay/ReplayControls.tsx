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
    <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 border border-cyan-500/20">
      {/* Transport buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSeekStart}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Go to start (Home)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 4v8H3V4h1zm1.7 4l5.3 4V4l-5.3 4z" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          className={`p-1.5 rounded transition-colors ${
            state === "playing"
              ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 pulse-glow"
              : "hover:bg-white/10 text-gray-400 hover:text-cyan-400"
          }`}
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
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors"
          title="Stop (Escape)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <rect x="3" y="3" width="10" height="10" />
          </svg>
        </button>

        <button
          onClick={handleSeekEnd}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-colors"
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
        className="text-xs font-mono px-2 py-1 rounded glass border border-cyan-500/20 text-cyan-400 hover:bg-white/5 transition-colors min-w-[3rem] text-center"
        title="Click to cycle speed"
      >
        {speed}x
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-2 bg-white/5 rounded-full cursor-pointer relative group border border-cyan-500/10"
        onClick={handleProgressClick}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(progress * 100).toFixed(1)}%`,
            background: 'linear-gradient(90deg, #00e5ff, #00e5ff)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full shadow-md shadow-orange-400/30 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${(progress * 100).toFixed(1)}% - 6px)`, boxShadow: '0 0 8px rgba(255, 145, 0, 0.5)' }}
        />
      </div>

      {/* Time display */}
      <span className="text-xs text-cyan-400 font-mono min-w-[6rem] text-right">
        {formatTime(time)}
      </span>
    </div>
  );
}
