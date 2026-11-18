import { FlightTrack, PhaseSegment } from "@skylens-aviation/core";

/** An event on the replay timeline */
export interface TimelineEvent {
  time: number;
  type: string;
  label: string;
  aircraft?: string;
  data?: Record<string, unknown>;
}

/** Manages a collection of timeline events */
export class EventTimeline {
  private events: TimelineEvent[] = [];

  addEvent(event: TimelineEvent): void {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }

  removeEvent(time: number, type: string): boolean {
    const idx = this.events.findIndex(
      (e) => e.time === time && e.type === type,
    );
    if (idx >= 0) {
      this.events.splice(idx, 1);
      return true;
    }
    return false;
  }

  getEventsInRange(start: number, end: number): TimelineEvent[] {
    return this.events.filter((e) => e.time >= start && e.time <= end);
  }

  getEventsForAircraft(icao24: string): TimelineEvent[] {
    return this.events.filter((e) => e.aircraft === icao24);
  }

  getAllEvents(): TimelineEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}

/** Generate timeline events from flight phase transitions */
export function generatePhaseEvents(
  track: FlightTrack,
  phases: PhaseSegment[],
): TimelineEvent[] {
  return phases.map((phase) => ({
    time: phase.startTime,
    type: "phase_change",
    label: `${phase.phase} begins`,
    aircraft: track.icao24,
    data: {
      phase: phase.phase,
      startIndex: phase.startIndex,
      endIndex: phase.endIndex,
    },
  }));
}
