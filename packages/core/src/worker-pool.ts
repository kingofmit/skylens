/** Message protocol for worker tasks */
export interface WorkerTask<T = unknown> {
  id: number;
  type: string;
  data: T;
}

/** Message protocol for worker results */
export interface WorkerResult<T = unknown> {
  id: number;
  data?: T;
  error?: string;
}

/** Pool of Web Workers for parallel computation */
export class WorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private nextId = 0;
  private robin = 0;

  constructor(workerUrl: string, poolSize: number = navigator?.hardwareConcurrency ?? 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerUrl, { type: "module" });
      worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        const { id, data, error } = e.data;
        const handler = this.pending.get(id);
        if (!handler) return;
        this.pending.delete(id);
        if (error) handler.reject(new Error(error));
        else handler.resolve(data);
      };
      this.workers.push(worker);
    }
  }

  execute<T>(type: string, data: unknown, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      const worker = this.workers[this.robin % this.workers.length];
      this.robin++;
      const msg: WorkerTask = { id, type, data };
      worker.postMessage(msg, transfer ?? []);
    });
  }

  terminate(): void {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    for (const handler of this.pending.values()) {
      handler.reject(new Error("Worker pool terminated"));
    }
    this.pending.clear();
  }

  get size(): number {
    return this.workers.length;
  }
}
