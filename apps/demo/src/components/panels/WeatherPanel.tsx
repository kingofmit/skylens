import { useMemo } from "react";
import type { SyntheticData } from "../../data/synthetic";
import { parseMETAR, parseTAF, parsePIREP, metarToWindBarbs, windBarbGeometry } from "@skylens/weather";
import { CATEGORY_COLORS } from "../../lib/colors";

interface Props {
  data: SyntheticData;
}

function formatTime(ts: number): string {
  if (ts === 0) return "--:--Z";
  return new Date(ts * 1000).toISOString().slice(11, 16) + "Z";
}

function WindBarbSVG({ dirDeg, speedKts }: { dirDeg: number; speedKts: number }) {
  const geom = useMemo(
    () => windBarbGeometry({ lat: 0, lon: 0, directionDeg: dirDeg, speedKts }),
    [dirDeg, speedKts],
  );

  return (
    <svg width="48" height="48" viewBox="-25 -45 50 50" className="inline-block">
      {/* Shaft */}
      {geom.shaft.length >= 2 && (
        <line
          x1={geom.shaft[0][0]}
          y1={geom.shaft[0][1]}
          x2={geom.shaft[1][0]}
          y2={geom.shaft[1][1]}
          stroke="#d1d5db"
          strokeWidth={2}
        />
      )}
      {/* Flags (barbs) */}
      {geom.flags.map((flag, i) =>
        flag.length >= 2 ? (
          <line
            key={`f${i}`}
            x1={flag[0][0]}
            y1={flag[0][1]}
            x2={flag[1][0]}
            y2={flag[1][1]}
            stroke="#d1d5db"
            strokeWidth={2}
          />
        ) : null,
      )}
      {/* Pennants */}
      {geom.pennants.map((pen, i) =>
        pen.length >= 3 ? (
          <polygon
            key={`p${i}`}
            points={pen.map((p) => `${p[0]},${p[1]}`).join(" ")}
            fill="#d1d5db"
          />
        ) : null,
      )}
    </svg>
  );
}

export function WeatherPanel({ data }: Props) {
  const metars = useMemo(
    () => data.metarStrings.map((s) => parseMETAR(s)),
    [data.metarStrings],
  );

  const tafs = useMemo(
    () => data.tafStrings.map((s) => parseTAF(s)),
    [data.tafStrings],
  );

  const pireps = useMemo(
    () => data.pirepStrings.map((s) => parsePIREP(s)),
    [data.pirepStrings],
  );

  return (
    <div className="space-y-5 text-sm">
      <h3 className="text-lg font-semibold">Weather</h3>

      {/* Flight Category Legend */}
      <div className="flex gap-3 text-xs">
        {(["VFR", "MVFR", "IFR", "LIFR"] as const).map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            {cat}
          </span>
        ))}
      </div>

      {/* METAR Table */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">METARs</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-1">Stn</th>
              <th className="text-left py-1">Wind</th>
              <th className="py-1">Barb</th>
              <th className="text-right py-1">Vis</th>
              <th className="text-right py-1">Ceil</th>
              <th className="text-right py-1">Temp</th>
              <th className="text-center py-1">Cat</th>
            </tr>
          </thead>
          <tbody>
            {metars.map((m, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-1 font-mono">{m.station}</td>
                <td className="py-1">
                  {m.windDir.toString().padStart(3, "0")}/{m.windSpeedKts}kt
                  {m.windGustKts ? `G${m.windGustKts}` : ""}
                </td>
                <td className="py-1 text-center">
                  {m.windSpeedKts > 0 && (
                    <WindBarbSVG dirDeg={m.windDir} speedKts={m.windSpeedKts} />
                  )}
                </td>
                <td className="text-right py-1">{m.visibility}SM</td>
                <td className="text-right py-1">
                  {m.ceiling != null ? `${m.ceiling}ft` : "-"}
                </td>
                <td className="text-right py-1">{m.tempC}&deg;C</td>
                <td className="text-center py-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: CATEGORY_COLORS[m.flightCategory] + "33",
                      color: CATEGORY_COLORS[m.flightCategory],
                    }}
                  >
                    {m.flightCategory}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* TAF Display */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">TAFs</h4>
        {tafs.map((taf, ti) => (
          <div key={ti} className="bg-gray-800 rounded-lg p-3 mb-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-mono font-semibold">{taf.station}</span>
              <span className="text-xs text-gray-400">
                Valid {formatTime(taf.validFrom)} - {formatTime(taf.validTo)}
              </span>
            </div>
            {taf.forecasts.length === 0 ? (
              <p className="text-gray-500 text-xs">No forecast periods parsed</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-1">Type</th>
                    <th className="text-left py-1">From</th>
                    <th className="text-left py-1">To</th>
                    <th className="text-left py-1">Wind</th>
                    <th className="text-right py-1">Vis</th>
                    <th className="text-right py-1">Ceil</th>
                  </tr>
                </thead>
                <tbody>
                  {taf.forecasts.map((f, fi) => (
                    <tr key={fi} className="border-b border-gray-800">
                      <td className="py-1">
                        <span className="px-1 py-0.5 bg-gray-700 rounded text-xs">
                          {f.changeType}
                        </span>
                      </td>
                      <td className="py-1">{formatTime(f.from)}</td>
                      <td className="py-1">{formatTime(f.to)}</td>
                      <td className="py-1">
                        {f.windDir.toString().padStart(3, "0")}/{f.windSpeedKts}kt
                      </td>
                      <td className="text-right py-1">{f.visibility}SM</td>
                      <td className="text-right py-1">
                        {f.ceiling != null ? `${f.ceiling}ft` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </section>

      {/* PIREP List */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          PIREPs ({pireps.length})
        </h4>
        {pireps.length === 0 ? (
          <p className="text-gray-500 text-xs">No PIREPs</p>
        ) : (
          <div className="space-y-1">
            {pireps.map((p, i) => (
              <div key={i} className="bg-gray-800 rounded px-3 py-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-300">
                    FL{(p.altitudeFt / 100).toFixed(0).padStart(3, "0")}
                  </span>
                  <span className="text-xs text-gray-500">{formatTime(p.time)}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs">
                  {p.turbulence && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        p.turbulence === "SEV" || p.turbulence === "EXTRM"
                          ? "bg-red-900/50 text-red-400"
                          : p.turbulence === "MOD"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-green-900/50 text-green-400"
                      }`}
                    >
                      TB: {p.turbulence}
                    </span>
                  )}
                  {p.icing && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold ${
                        p.icing === "SEV"
                          ? "bg-red-900/50 text-red-400"
                          : p.icing === "MOD"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-blue-900/50 text-blue-400"
                      }`}
                    >
                      IC: {p.icing}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
