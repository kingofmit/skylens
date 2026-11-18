import { useState, useEffect, useMemo, useRef } from "react";
import type { FlightTrack } from "@skylens/core";
import {
  ReplayEngine,
  ReplayClock,
  KeyboardShortcuts,
  EventTimeline,
  PictureInPicture,
  FrameRecorder,
  generatePhaseEvents,
} from "@skylens/replay";
import type { ClockState } from "@skylens/replay";
import { detectFlightPhases } from "@skylens/ingest";

export interface UseReplayReturn {
  engine: ReplayEngine;
  clock: ReplayClock;
  shortcuts: KeyboardShortcuts;
  timeline: EventTimeline;
  pip: PictureInPicture;
  recorder: FrameRecorder;
  time: number;
  state: ClockState;
  speed: number;
  progress: number;
}

export function useReplay(tracks: FlightTrack[]): UseReplayReturn {
  const engineRef = useRef<ReplayEngine | null>(null);
  const shortcutsRef = useRef<KeyboardShortcuts | null>(null);
  const timelineRef = useRef<EventTimeline | null>(null);
  const pipRef = useRef<PictureInPicture | null>(null);
  const recorderRef = useRef<FrameRecorder | null>(null);

  // Initialize all instances once
  if (!engineRef.current) {
    engineRef.current = new ReplayEngine();
    shortcutsRef.current = new KeyboardShortcuts(engineRef.current);
    timelineRef.current = new EventTimeline();
    pipRef.current = new PictureInPicture(engineRef.current);
    recorderRef.current = new FrameRecorder(engineRef.current);
  }

  const engine = engineRef.current;
  const clock = engine.getClock();
  const shortcuts = shortcutsRef.current!;
  const timeline = timelineRef.current!;
  const pip = pipRef.current!;
  const recorder = recorderRef.current!;

  const [time, setTime] = useState(0);
  const [state, setState] = useState<ClockState>("stopped");
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  // Load tracks and populate timeline events
  useEffect(() => {
    engine.loadTracks(tracks);

    timeline.clear();
    for (const track of tracks) {
      const phases = detectFlightPhases(track);
      const events = generatePhaseEvents(track, phases);
      for (const event of events) {
        timeline.addEvent(event);
      }
    }

    // Reset state to match clock after loading
    setTime(clock.getTime());
    setState(clock.getState());
    setSpeed(clock.getSpeed());
    setProgress(clock.getProgress());
  }, [tracks, engine, clock, timeline]);

  // Subscribe to clock ticks for reactive state updates
  useEffect(() => {
    const unsubTick = clock.onTick((t) => {
      setTime(t);
      setState(clock.getState());
      setSpeed(clock.getSpeed());
      setProgress(clock.getProgress());
    });

    return unsubTick;
  }, [clock]);

  // Enable keyboard shortcuts on mount, disable on unmount
  useEffect(() => {
    shortcuts.enable();
    return () => shortcuts.disable();
  }, [shortcuts]);

  // Clean up engine on unmount
  useEffect(() => {
    return () => {
      engine.stop();
    };
  }, [engine]);

  return { engine, clock, shortcuts, timeline, pip, recorder, time, state, speed, progress };
}
