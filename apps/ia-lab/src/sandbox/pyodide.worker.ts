/// <reference lib="webworker" />
import { PYTHON_HARNESS } from "./harness";
import type { SandboxRequest } from "./types";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

interface PyodideInstance {
  loadPackage(packages: string[]): Promise<void>;
  toPy(value: unknown): { destroy?: () => void };
  globals: {
    set(name: string, value: unknown): void;
    delete(name: string): void;
  };
  runPythonAsync(source: string): Promise<string>;
}

let pyodide: PyodideInstance | undefined;
const loadedPackages = new Set<string>();

async function initialize() {
  try {
    workerScope.postMessage({ type: "status", status: "loading" });
    const pyodideModuleUrl =
      "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs";
    const pyodideModule = (await import(
      /* @vite-ignore */ pyodideModuleUrl
    )) as {
      loadPyodide(options: { indexURL: string }): Promise<PyodideInstance>;
    };
    pyodide = await pyodideModule.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
    });
    workerScope.postMessage({ type: "status", status: "ready" });
  } catch (error) {
    workerScope.postMessage({
      type: "status",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function run(request: SandboxRequest) {
  if (!pyodide) return;
  const startedAt = performance.now();
  try {
    const packages = [...new Set(request.packages ?? [])].filter(
      (name) => !loadedPackages.has(name),
    );
    if (packages.length) {
      await pyodide.loadPackage(packages);
      packages.forEach((name) => loadedPackages.add(name));
    }

    const input = pyodide.toPy({
      code: request.code,
      tests: request.tests ?? [],
    });
    pyodide.globals.set("__ialab_input", input);
    workerScope.postMessage({ type: "started", id: request.id });
    const rawResult = await pyodide.runPythonAsync(PYTHON_HARNESS);
    const result = JSON.parse(rawResult) as Omit<
      import("./types").SandboxResult,
      "durationMs"
    >;
    workerScope.postMessage({
      type: "result",
      id: request.id,
      ...result,
      durationMs: Math.round(performance.now() - startedAt),
    });
    pyodide.globals.delete("__ialab_input");
    input.destroy?.();
  } catch (error) {
    workerScope.postMessage({
      type: "result",
      id: request.id,
      stdout: "",
      stderr: "",
      error: error instanceof Error ? error.message : String(error),
      tests: [],
      durationMs: Math.round(performance.now() - startedAt),
    });
    try {
      pyodide.globals.delete("__ialab_input");
    } catch {
      return;
    }
  }
}

workerScope.addEventListener("message", (event: MessageEvent<SandboxRequest>) => {
  if (event.data.type === "run") void run(event.data);
});

void initialize();
