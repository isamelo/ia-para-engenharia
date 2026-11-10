import type { Criterio, NivelEvidenciado, ResultadoCriterio } from "./types";

export function juntarCriterios(
  criterios: Criterio[],
  testes: { name: string; passed: boolean; message: string }[],
): ResultadoCriterio[] {
  return criterios.map((criterio, index) => ({
    name: criterio.name,
    nivel: criterio.nivel,
    passed: testes[index]?.passed ?? false,
    message: testes[index]?.message ?? "",
  }));
}

/** Todos os critérios de nível 2 => 2; todos os critérios => 3; caso contrário, 1. */
export function nivelEvidenciado(
  resultados: Pick<ResultadoCriterio, "nivel" | "passed">[],
): NivelEvidenciado {
  if (!resultados.length) return 1;
  const basicos = resultados.filter((item) => item.nivel === 2);
  if (!basicos.every((item) => item.passed)) return 1;
  return resultados.every((item) => item.passed) ? 3 : 2;
}
