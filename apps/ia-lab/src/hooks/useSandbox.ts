import { useEffect, useState } from "react";
import type { TestCase } from "../data/types";
import { sandboxClient } from "../sandbox/client";
import type { SandboxResult, SandboxStatus } from "../sandbox/types";

export function useSandbox() {
  const [status, setStatus] = useState<SandboxStatus>(sandboxClient.getStatus());

  useEffect(() => sandboxClient.subscribe(setStatus), []);

  function run(
    code: string,
    tests: TestCase[] = [],
    packages: string[] = [],
  ): Promise<SandboxResult> {
    return sandboxClient.run(code, tests, packages);
  }

  return { status, run };
}
