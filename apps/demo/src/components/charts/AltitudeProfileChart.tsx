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
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="distanceNm"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          label={{ value: "Distance (nm)", position: "insideBottom", offset: -2, fill: "#9ca3af", fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          label={{ value: "Alt (ft)", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
          labelStyle={{ color: "#d1d5db" }}
          itemStyle={{ color: "#93c5fd" }}
          formatter={(value: number) => [`${value.toLocaleString()} ft`, "Altitude"]}
          labelFormatter={(v) => `${v} nm`}
        />
        <Area
          type="monotone"
          dataKey="altitudeFt"
          stroke="#3b82f6"
          fill="url(#altGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
