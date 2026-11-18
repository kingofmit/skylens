import { FlightTrack, FlightPhase, PhaseSegment } from "@skylens-aviation/core";

const MIN_STATES_FOR_TRANSITION = 3;

/** Detect flight phases from a track's state vector sequence */
export function detectFlightPhases(track: FlightTrack): PhaseSegment[] {
  const { states } = track;
  if (states.length === 0) return [];

  const segments: PhaseSegment[] = [];
  let currentPhase = classifyState(states[0], null);
  let startIndex = 0;
  let pendingPhase: FlightPhase | null = null;
  let pendingCount = 0;

  for (let i = 1; i < states.length; i++) {
    const prev = states[i - 1];
    const phase = classifyState(states[i], prev);

    if (phase !== currentPhase) {
      if (phase === pendingPhase) {
        pendingCount++;
      } else {
        pendingPhase = phase;
        pendingCount = 1;
      }

      if (pendingCount >= MIN_STATES_FOR_TRANSITION) {
        const transitionIndex = i - pendingCount + 1;
        segments.push({
          phase: currentPhase,
          startIndex,
          endIndex: transitionIndex - 1,
          startTime: states[startIndex].timestamp,
          endTime: states[transitionIndex - 1].timestamp,
        });
        currentPhase = pendingPhase!;
        startIndex = transitionIndex;
        pendingPhase = null;
        pendingCount = 0;
      }
    } else {
      pendingPhase = null;
      pendingCount = 0;
    }
  }

  segments.push({
    phase: currentPhase,
    startIndex,
    endIndex: states.length - 1,
    startTime: states[startIndex].timestamp,
    endTime: states[states.length - 1].timestamp,
  });

  return segments;
}

function classifyState(
  state: { altitudeFt: number; groundSpeedKts: number; verticalRateFpm: number; onGround: boolean },
  prev: { altitudeFt: number; groundSpeedKts: number; verticalRateFpm: number; onGround: boolean } | null,
): FlightPhase {
  if (state.onGround || (state.altitudeFt < 200 && state.groundSpeedKts < 30)) {
    if (prev && !prev.onGround && prev.altitudeFt > 200) return "landing";
    if (prev && (prev.onGround || prev.altitudeFt < 200) && state.groundSpeedKts > 30) return "takeoff";
    return "ground";
  }

  if (state.altitudeFt < 200 && state.groundSpeedKts > 30) {
    return "takeoff";
  }

  if (state.verticalRateFpm > 500) return "climb";
  if (state.verticalRateFpm < -500) {
    if (state.altitudeFt < 10000 && state.groundSpeedKts < 200) return "approach";
    return "descent";
  }

  // Stable altitude — cruise
  if (Math.abs(state.verticalRateFpm) <= 500) {
    if (state.altitudeFt < 10000 && prev && prev.verticalRateFpm < -300) return "approach";
    return "cruise";
  }

  return "cruise";
}

/** Find the flight phase at a specific time */
export function phaseAtTime(phases: PhaseSegment[], time: number): FlightPhase | null {
  for (const seg of phases) {
    if (time >= seg.startTime && time <= seg.endTime) return seg.phase;
  }
  return null;
}
