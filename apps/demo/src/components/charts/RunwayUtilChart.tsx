import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface Props {
  utilization: Map<string, { arrivals: number; departures: number; operations: number }>;
}

export function RunwayUtilChart({ utilization }: Props) {
  const data = useMemo(() => {
    const rows: { runway: string; arrivals: number; departures: number }[] = [];
    utilization.forEach((stats, runway) => {
      rows.push({ runway, arrivals: stats.arrivals, departures: stats.departures });
    });
    return rows;
  }, [utilization]);

  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No runway utilization data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="runway" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#d1d5db" }} />
        <Bar dataKey="arrivals" fill="#3b82f6" name="Arrivals" radius={[4, 4, 0, 0]} />
        <Bar dataKey="departures" fill="#10b981" name="Departures" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
