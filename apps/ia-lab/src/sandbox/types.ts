import type { TestCase } from "../data/types";

export type SandboxStatus = "loading" | "ready" | "error";

export interface SandboxResult {
  stdout: string;
  stderr: string;
  error: string | null;
  tests: { name: string; passed: boolean; message: string }[];
  durationMs: number;
}

export interface SandboxRequest {
  type: "run";
  id: number;
  code: string;
  tests?: TestCase[];
  packages?: string[];
}
