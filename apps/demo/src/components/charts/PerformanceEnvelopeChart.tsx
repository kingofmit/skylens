import { useMemo } from "react";
import type { FlightDNAMetrics } from "@skylens/core";
import { buildPerformanceEnvelopeProfile } from "@skylens/core";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
} from "recharts";

interface Props {
  metrics: FlightDNAMetrics[];
  param: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function PerformanceEnvelopeChart({ metrics, param }: Props) {
  const data = useMemo(() => {
    const profile = buildPerformanceEnvelopeProfile(metrics, param);
    return profile.map((p) => ({
      ...p,
      exceedsEnvelope: p.value > p.max || p.value < p.min,
    }));
  }, [metrics, param]);

  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No envelope data for {param}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="envGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#39ff14" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#39ff14" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.08)" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          stroke="#00e5ff"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
        />
        <YAxis stroke="#00e5ff" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8 }}
          labelFormatter={(v) => formatTime(v as number)}
          formatter={(value: number, name: string) => [value.toFixed(1), name]}
        />
        <Area type="monotone" dataKey="max" stroke="none" fill="url(#envGradient)" />
        <Area type="monotone" dataKey="min" stroke="none" fill="rgba(0,10,20,0.9)" />
        <Line type="monotone" dataKey="max" stroke="#39ff14" strokeDasharray="4 4" dot={false} strokeWidth={1} name="Max" />
        <Line type="monotone" dataKey="min" stroke="#39ff14" strokeDasharray="4 4" dot={false} strokeWidth={1} name="Min" />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#ff9100"
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.exceedsEnvelope) {
              return <circle cx={cx} cy={cy} r={4} fill="#ff5252" stroke="#ff5252" />;
            }
            return <circle cx={cx} cy={cy} r={2} fill="#ff9100" stroke="#ff9100" />;
          }}
          strokeWidth={2}
          name={param}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
