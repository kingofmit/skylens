import { ReplayEngine } from "./engine";

type ActionFn = () => void;

/** Keyboard shortcuts for replay control */
export class KeyboardShortcuts {
  private engine: ReplayEngine;
  private bindings = new Map<string, ActionFn>();
  private enabled = false;
  private handler: ((e: KeyboardEvent) => void) | null = null;

  constructor(engine: ReplayEngine) {
    this.engine = engine;
    this.setupDefaults();
  }

  bind(key: string, action: string | ActionFn): void {
    const fn = typeof action === "function" ? action : this.resolveAction(action);
    if (fn) this.bindings.set(key.toLowerCase(), fn);
  }

  unbind(key: string): void {
    this.bindings.delete(key.toLowerCase());
  }

  getBindings(): Map<string, string> {
    const result = new Map<string, string>();
    for (const key of this.bindings.keys()) {
      result.set(key, key);
    }
    return result;
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const fn = this.bindings.get(key);
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("keydown", this.handler as EventListener);
    }
  }

  disable(): void {
    this.enabled = false;
    if (this.handler && typeof globalThis.removeEventListener === "function") {
      globalThis.removeEventListener("keydown", this.handler as EventListener);
    }
    this.handler = null;
  }

  private setupDefaults(): void {
    const clock = this.engine.getClock();

    this.bindings.set(" ", () => {
      if (clock.getState() === "playing") clock.pause();
      else clock.play();
    });

    this.bindings.set("arrowleft", () => {
      clock.seek(clock.getTime() - 10);
    });

    this.bindings.set("arrowright", () => {
      clock.seek(clock.getTime() + 10);
    });

    this.bindings.set("+", () => {
      clock.setSpeed(clock.getSpeed() * 2);
    });

    this.bindings.set("=", () => {
      clock.setSpeed(clock.getSpeed() * 2);
    });

    this.bindings.set("-", () => {
      clock.setSpeed(Math.max(0.25, clock.getSpeed() / 2));
    });

    this.bindings.set("home", () => {
      const range = this.engine.getTimeRange();
      if (range) clock.seek(range.start);
    });

    this.bindings.set("end", () => {
      const range = this.engine.getTimeRange();
      if (range) clock.seek(range.end);
    });
  }

  private resolveAction(name: string): ActionFn | null {
    const clock = this.engine.getClock();
    switch (name) {
      case "play": return () => clock.play();
      case "pause": return () => clock.pause();
      case "stop": return () => this.engine.stop();
      case "toggle": return () => {
        if (clock.getState() === "playing") clock.pause();
        else clock.play();
      };
      default: return null;
    }
  }
}
