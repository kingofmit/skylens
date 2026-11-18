import { useMemo } from "react";
import type { FlightTrack } from "@skylens/core";
import { buildAltitudeProfile } from "@skylens/paths";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  track: FlightTrack;
}

const M_TO_NM = 0.000539957;

export function AltitudeProfileChart({ track }: Props) {
  const data = useMemo(() => {
    const profile = buildAltitudeProfile(track);
    return profile.points.map((p) => ({
      distanceNm: +(p.distanceM * M_TO_NM).toFixed(1),
      altitudeFt: Math.round(p.altitudeFt),
    }));
  }, [track]);

  if (data.length === 0) {
    return <p className="text-gray-400 text-sm">No altitude data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.08)" />
        <XAxis
          dataKey="distanceNm"
          stroke="#00e5ff"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          label={{ value: "Distance (nm)", position: "insideBottom", offset: -2, fill: "#94a3b8", fontSize: 11 }}
        />
        <YAxis
          stroke="#00e5ff"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          label={{ value: "Alt (ft)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8 }}
          labelStyle={{ color: "#00e5ff" }}
          itemStyle={{ color: "#ff9100" }}
          formatter={(value: number) => [`${value.toLocaleString()} ft`, "Altitude"]}
          labelFormatter={(v) => `${v} nm`}
        />
        <Area
          type="monotone"
          dataKey="altitudeFt"
          stroke="#00e5ff"
          fill="url(#altGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
