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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.08)" />
        <XAxis dataKey="runway" stroke="#00e5ff" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis stroke="#00e5ff" tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Bar dataKey="arrivals" fill="#00e5ff" name="Arrivals" radius={[4, 4, 0, 0]} />
        <Bar dataKey="departures" fill="#39ff14" name="Departures" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
