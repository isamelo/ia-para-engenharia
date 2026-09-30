import type { TestCase } from "../data/types";
import type {
  SandboxRequest,
  SandboxResult,
  SandboxStatus,
} from "./types";

interface QueuedRun {
  request: SandboxRequest;
  resolve: (result: SandboxResult) => void;
}

interface WorkerMessage {
  type: "status" | "started" | "result";
  status?: SandboxStatus;
  id?: number;
  message?: string;
  stdout?: string;
  stderr?: string;
  error?: string | null;
  tests?: SandboxResult["tests"];
  durationMs?: number;
}

const TIMEOUT_MS = 10_000;

class SandboxClient {
  private worker: Worker | undefined;
  private status: SandboxStatus = "loading";
  private listeners = new Set<(status: SandboxStatus) => void>();
  private queue: QueuedRun[] = [];
  private active: QueuedRun | undefined;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private nextId = 1;

  constructor() {
    this.createWorker();
  }

  subscribe(listener: (status: SandboxStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SandboxStatus {
    return this.status;
  }

  run(
    code: string,
    tests: TestCase[] = [],
    packages: string[] = [],
  ): Promise<SandboxResult> {
    return new Promise((resolve) => {
      const request: SandboxRequest = {
        type: "run",
        id: this.nextId++,
        code,
        tests,
        packages,
      };
      this.queue.push({ request, resolve });
      this.dispatchNext();
    });
  }

  private setStatus(status: SandboxStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private createWorker() {
    this.setStatus("loading");
    this.worker = new Worker(
      new URL("./pyodide.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.addEventListener("message", (event: MessageEvent<WorkerMessage>) =>
      this.onMessage(event.data),
    );
    this.worker.addEventListener("error", (event) => {
      this.setStatus("error");
      if (this.active) {
        this.finish({
          stdout: "",
          stderr: "",
          error: event.message || "Não foi possível iniciar o Python.",
          tests: [],
          durationMs: 0,
        });
      }
    });
  }

  private onMessage(message: WorkerMessage) {
    if (message.type === "status" && message.status) {
      this.setStatus(message.status);
      if (message.status === "error" && this.active) {
        this.finish({
          stdout: "",
          stderr: "",
          error: message.message ?? "Não foi possível carregar o Python.",
          tests: [],
          durationMs: 0,
        });
      }
      if (message.status === "ready") this.dispatchNext();
      return;
    }

    if (message.type === "started" && message.id === this.active?.request.id) {
      this.timeout = setTimeout(() => this.recoverAfterTimeout(), TIMEOUT_MS);
      return;
    }

    if (message.type === "result" && message.id === this.active?.request.id) {
      this.finish({
        stdout: message.stdout ?? "",
        stderr: message.stderr ?? "",
        error: message.error ?? null,
        tests: message.tests ?? [],
        durationMs: message.durationMs ?? 0,
      });
    }
  }

  private dispatchNext() {
    if (this.status !== "ready" || this.active || !this.queue.length) return;
    this.active = this.queue.shift();
    this.worker?.postMessage(this.active!.request);
  }

  private finish(result: SandboxResult) {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
    const active = this.active;
    this.active = undefined;
    active?.resolve(result);
    this.dispatchNext();
  }

  private recoverAfterTimeout() {
    this.timeout = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    const active = this.active;
    this.active = undefined;
    active?.resolve({
      stdout: "",
      stderr: "",
      error: "Tempo limite excedido (10s). Verifique loops infinitos.",
      tests: [],
      durationMs: TIMEOUT_MS,
    });
    this.createWorker();
  }
}

export const sandboxClient = new SandboxClient();
