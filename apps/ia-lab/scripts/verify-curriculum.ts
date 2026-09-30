import { loadPyodide } from "pyodide";
import { curriculum } from "../src/data/curriculum";
import type { Level, Lesson } from "../src/data/types";
import { PYTHON_HARNESS } from "../src/sandbox/harness";

const pyodide = await loadPyodide();

interface HarnessResult {
  stdout: string;
  stderr: string;
  error: string | null;
  tests: { name: string; passed: boolean; message: string }[];
}

async function runHarness(code: string, lesson: Lesson): Promise<HarnessResult> {
  const input = pyodide.toPy({
    code,
    tests: lesson.tests,
  });
  pyodide.globals.set("__ialab_input", input);
  try {
    const rawResult = await pyodide.runPythonAsync(PYTHON_HARNESS);
    return JSON.parse(String(rawResult)) as HarnessResult;
  } finally {
    pyodide.globals.delete("__ialab_input");
    input.destroy();
  }
}

async function verifyLesson(lesson: Lesson) {
  if (lesson.packages?.length) {
    await pyodide.loadPackage(lesson.packages);
  }

  const solution = await runHarness(lesson.solution, lesson);
  const solutionPasses =
    solution.error === null &&
    solution.tests.length > 0 &&
    solution.tests.every((test) => test.passed);
  const starter = await runHarness(lesson.starterCode, lesson);
  const starterFails =
    starter.error !== null || starter.tests.some((test) => !test.passed);

  return {
    lesson: lesson.title,
    solution: solutionPasses ? "PASSA" : "FALHA",
    starter: starterFails ? "FALHA COMO ESPERADO" : "PASSOU (INESPERADO)",
    passed: solutionPasses && starterFails,
    solutionTests: solution.tests,
    starterTests: starter.tests,
    solutionError: solution.error,
    starterError: starter.error,
  };
}

const rows: Awaited<ReturnType<typeof verifyLesson>>[] = [];
for (const level of curriculum as Level[]) {
  for (const lesson of level.lessons) {
    try {
      rows.push(await verifyLesson(lesson));
    } catch (error) {
      rows.push({
        lesson: lesson.title,
        solution: "FALHA",
        starter: "NÃO VERIFICADO",
        passed: false,
        solutionTests: [],
        starterTests: [],
        solutionError: error instanceof Error ? error.message : String(error),
        starterError: null,
      });
    }
  }
}

console.table(
  rows.map(({ lesson, solution, starter, passed }) => ({
    Lição: lesson,
    Solução: solution,
    "Código inicial": starter,
    Resultado: passed ? "OK" : "FALHA",
  })),
);

for (const row of rows.filter((result) => !result.passed)) {
  console.error(`\n${row.lesson}`);
  if (row.solutionError) console.error(`Solução: ${row.solutionError}`);
  if (row.starterError) console.error(`Código inicial: ${row.starterError}`);
  row.solutionTests
    .filter((test) => !test.passed)
    .forEach((test) => console.error(`Solução · ${test.name}: ${test.message}`));
  row.starterTests
    .filter((test) => test.passed)
    .forEach((test) => console.error(`Código inicial passou · ${test.name}`));
}

if (rows.some((row) => !row.passed)) process.exitCode = 1;
