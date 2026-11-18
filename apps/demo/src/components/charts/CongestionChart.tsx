import { useMemo } from "react";
import type { StateVector, BoundingBox } from "@skylens/core";
import { congestionTimeSeries } from "@skylens/heatmap";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  states: StateVector[];
  regions: BoundingBox[];
}

const REGION_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function CongestionChart({ states, regions }: Props) {
  const { data, regionKeys } = useMemo(() => {
    if (states.length === 0 || regions.length === 0) return { data: [], regionKeys: [] };

    const seriesMap = new Map<number, Record<string, number>>();
    const keys: string[] = [];

    regions.forEach((region, idx) => {
      const key = `region_${idx}`;
      keys.push(key);
      const series = congestionTimeSeries(states, region, 60);
      for (const pt of series) {
        let row = seriesMap.get(pt.time);
        if (!row) {
          row = { time: pt.time };
          seriesMap.set(pt.time, row);
        }
        row[key] = +pt.score.toFixed(2);
      }
    });

    const rows = Array.from(seriesMap.values()).sort(
      (a, b) => (a.time as number) - (b.time as number),
    );
    return { data: rows, regionKeys: keys };
  }, [states, regions]);

  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No congestion data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
        />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
          labelFormatter={(v) => formatTime(v as number)}
        />
        {regionKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={REGION_COLORS[i % REGION_COLORS.length]}
            dot={false}
            strokeWidth={2}
            name={`Region ${i + 1}`}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
