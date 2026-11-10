import { loadPyodide } from "pyodide";
import { curriculum } from "../src/data/curriculum";
import { itensDiagnostico } from "../src/data/diagnostico";
import { missoesSandbox } from "../src/data/missoes";
import {
  cenarioRevisao,
  corrigirRevisao,
  diffLinhas,
  missaoRevisao,
} from "../src/data/missoes/revisao";
import type { Achado } from "../src/data/missoes/revisao";
import { juntarCriterios, nivelEvidenciado } from "../src/data/pontuacao";
import type { Desafio, Level, Lesson, TestCase } from "../src/data/types";
import { PYTHON_HARNESS } from "../src/sandbox/harness";

const pyodide = await loadPyodide();

interface HarnessResult {
  stdout: string;
  stderr: string;
  error: string | null;
  tests: { name: string; passed: boolean; message: string }[];
}

async function runHarness(
  code: string,
  tests: TestCase[],
  prelude = "",
): Promise<HarnessResult> {
  const input = pyodide.toPy({ code, tests, prelude });
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

  const solution = await runHarness(lesson.solution, lesson.tests);
  const solutionPasses =
    solution.error === null &&
    solution.tests.length > 0 &&
    solution.tests.every((test) => test.passed);
  const starter = await runHarness(lesson.starterCode, lesson.tests);
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

const soDesafios = process.argv.includes("--desafios");
const rows: Awaited<ReturnType<typeof verifyLesson>>[] = [];
for (const level of soDesafios ? [] : (curriculum as Level[])) {
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

if (rows.length) console.table(
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

/** Diagnóstico e missões: a solução evidencia o nível 3, a parcial o 2 e o código inicial o 1. */
async function verifyDesafio(desafio: Desafio) {
  if (desafio.packages?.length) await pyodide.loadPackage(desafio.packages);
  const problemas: string[] = [];

  async function conferir(rotulo: string, code: string, esperado: number) {
    const resultado = await runHarness(code, desafio.criterios, desafio.cenario);
    const criterios = juntarCriterios(desafio.criterios, resultado.tests);
    const nivel = resultado.error === null ? nivelEvidenciado(criterios) : 1;
    if (nivel !== esperado || (esperado > 1 && resultado.error !== null)) {
      problemas.push(`${rotulo}: nível ${nivel}, esperado ${esperado}`);
      if (resultado.error) problemas.push(`  erro: ${resultado.error}`);
      criterios.forEach((criterio) =>
        problemas.push(
          `  [N${criterio.nivel}] ${criterio.passed ? "passou" : "falhou"} · ${criterio.name}${criterio.message ? ` · ${criterio.message}` : ""}`,
        ),
      );
    }
    return nivel;
  }

  const solucao = await conferir("Solução", desafio.solution, 3);
  const parcial = desafio.solucaoParcial
    ? await conferir("Solução parcial", desafio.solucaoParcial, 2)
    : null;
  const inicial = await conferir("Código inicial", desafio.starterCode, 1);
  const execucao = await runHarness(desafio.starterCode, [], desafio.cenario);
  if (execucao.error) {
    problemas.push(`Código inicial não executa: ${execucao.error}`);
  }
  if (!desafio.criterios.some((criterio) => criterio.nivel === 2)) {
    problemas.push("Sem critério de nível 2");
  }
  if (!desafio.criterios.some((criterio) => criterio.nivel === 3)) {
    problemas.push("Sem critério de nível 3");
  }
  return { desafio, solucao, parcial, inicial, problemas };
}

const desafios: {
  desafio: Desafio;
  solucao: number;
  parcial: number | null;
  inicial: number;
  problemas: string[];
}[] = [];
for (const desafio of [...itensDiagnostico, ...missoesSandbox]) {
  try {
    desafios.push(await verifyDesafio(desafio));
  } catch (error) {
    desafios.push({
      desafio,
      solucao: 0,
      parcial: null,
      inicial: 0,
      problemas: [error instanceof Error ? error.message : String(error)],
    });
  }
}

console.table(
  desafios.map(({ desafio, solucao, parcial, inicial, problemas }) => ({
    Desafio: desafio.id,
    Capacidade: desafio.capacidade,
    "Solução (3)": solucao,
    "Parcial (2)": parcial ?? "—",
    "Inicial (1)": inicial,
    Resultado: problemas.length ? "FALHA" : "OK",
  })),
);

for (const { desafio, problemas } of desafios.filter((item) => item.problemas.length)) {
  console.error(`\n${desafio.id}`);
  problemas.forEach((problema) => console.error(problema));
}

/** Revisão de PR: cada defeito é localizável no diff e a correção separa os níveis. */
const problemasRevisao: string[] = [];
const linhasAlteradas = missaoRevisao.arquivos.flatMap((arquivo) =>
  diffLinhas(arquivo.antes, arquivo.depois)
    .filter((linha) => linha.tipo !== "igual")
    .map((linha) => ({ arquivo: arquivo.nome, tipo: linha.tipo, texto: linha.texto })),
);
const bloquear = (linha: (typeof linhasAlteradas)[number]): Achado => ({
  arquivo: linha.arquivo,
  tipo: linha.tipo as Achado["tipo"],
  texto: linha.texto,
  severidade: "bloqueia",
  nota: "",
});
const umPorDefeito = missaoRevisao.defeitos.map((defeito) => {
  const linhas = linhasAlteradas.filter(
    (linha) =>
      linha.arquivo === defeito.arquivo &&
      defeito.marcas.some((marca) => linha.texto.includes(marca)),
  );
  for (const marca of defeito.marcas) {
    if (!linhas.some((linha) => linha.texto.includes(marca))) {
      problemasRevisao.push(`${defeito.id}: a marca "${marca}" não está em nenhuma linha alterada`);
    }
  }
  return linhas[0];
});
const isca = linhasAlteradas.filter((linha) => linha.texto.includes("logger") || linha.texto.includes("_saldo"));
const cenariosRevisao: [string, Achado[], number][] = [
  ["4 defeitos", umPorDefeito.map(bloquear), 3],
  ["4 defeitos e 1 indevido", [...umPorDefeito, isca[0]].map(bloquear), 3],
  ["4 defeitos e 2 indevidos", [...umPorDefeito, isca[0], isca[1]].map(bloquear), 2],
  ["2 defeitos", umPorDefeito.slice(0, 2).map(bloquear), 2],
  ["1 defeito", umPorDefeito.slice(0, 1).map(bloquear), 1],
  ["tudo bloqueado", linhasAlteradas.map(bloquear), 1],
  ["nada", [], 1],
];
for (const [rotulo, achados, esperado] of cenariosRevisao) {
  const nivel = nivelEvidenciado(corrigirRevisao(achados).criterios);
  if (nivel !== esperado) {
    problemasRevisao.push(`${rotulo}: nível ${nivel}, esperado ${esperado}`);
  }
}
const experimento = await runHarness(missaoRevisao.experimento, [], cenarioRevisao);
if (experimento.error) problemasRevisao.push(`Experimento não executa: ${experimento.error}`);
console.log(
  `Revisão de PR: ${linhasAlteradas.length} linhas alteradas, ${missaoRevisao.defeitos.length} defeitos · ${problemasRevisao.length ? "FALHA" : "OK"}`,
);
problemasRevisao.forEach((problema) => console.error(problema));

if (
  rows.some((row) => !row.passed) ||
  desafios.some((item) => item.problemas.length) ||
  problemasRevisao.length
) {
  process.exitCode = 1;
}
