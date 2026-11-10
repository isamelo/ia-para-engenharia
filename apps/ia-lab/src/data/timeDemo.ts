import { capacidades, papelPorId } from "./capacidades";
import type { CapacidadeId, PapelId } from "./types";

export interface PessoaDemo {
  nome: string;
  papel: PapelId;
  /** Níveis na ordem das capacidades do mapa, por ciclo. */
  ciclos: [number[], number[]];
  /** Capacidades com missão concluída no ciclo 2 (evidência verificada). */
  verificadas: CapacidadeId[];
}

export const CICLOS = ["Ciclo 1 · agosto", "Ciclo 2 · novembro"] as const;

export const SQUAD = "Squad Atendimento · Orla Pagamentos";

/** Dados fictícios. Servem para mostrar a visão da liderança, não representam pessoas reais. */
export const pessoasDemo: PessoaDemo[] = [
  { nome: "Aline Barros", papel: "techlead", ciclos: [[3, 2, 2, 2, 1, 2, 1, 2], [3, 3, 3, 3, 2, 3, 2, 2]], verificadas: ["rag", "agentes-codigo"] },
  { nome: "Caio Menezes", papel: "backend", ciclos: [[2, 2, 2, 1, 1, 1, 1, 1], [3, 3, 2, 3, 2, 2, 1, 2]], verificadas: ["rag"] },
  { nome: "Dandara Reis", papel: "backend", ciclos: [[3, 3, 3, 2, 2, 2, 1, 1], [3, 3, 3, 3, 3, 3, 2, 2]], verificadas: ["rag", "evals", "agentes-codigo"] },
  { nome: "Érico Sampaio", papel: "backend", ciclos: [[1, 1, 2, 0, 0, 1, 0, 0], [2, 2, 2, 1, 1, 1, 1, 1]], verificadas: [] },
  { nome: "Heloísa Tavares", papel: "plataforma", ciclos: [[2, 1, 2, 1, 2, 2, 2, 3], [2, 2, 3, 2, 3, 2, 3, 3]], verificadas: ["evals", "seguranca"] },
  { nome: "Jonas Peixoto", papel: "plataforma", ciclos: [[2, 2, 1, 1, 1, 2, 1, 2], [2, 2, 2, 2, 2, 3, 1, 3]], verificadas: [] },
  { nome: "Lívia Nakamura", papel: "qa", ciclos: [[1, 2, 2, 1, 2, 1, 1, 0], [2, 3, 3, 2, 3, 2, 2, 1]], verificadas: ["evals", "agentes-codigo"] },
  { nome: "Otávio Lins", papel: "qa", ciclos: [[1, 1, 1, 0, 1, 0, 1, 0], [2, 2, 2, 1, 2, 1, 1, 1]], verificadas: [] },
];

export interface LinhaTime {
  nome: string;
  papel: PapelId;
  niveis: number[];
  verificadas: CapacidadeId[];
  voce?: boolean;
}

export function linhasDoCiclo(ciclo: 0 | 1): LinhaTime[] {
  return pessoasDemo.map((pessoa) => ({
    nome: pessoa.nome,
    papel: pessoa.papel,
    niveis: pessoa.ciclos[ciclo],
    verificadas: ciclo === 1 ? pessoa.verificadas : [],
  }));
}

export const alvoDe = (papel: PapelId, indice: number) =>
  papelPorId[papel].alvo[capacidades[indice].id];

export function resumoDoTime(linhas: LinhaTime[]) {
  const porCapacidade = capacidades.map((capacidade, indice) => {
    const noAlvo = linhas.filter((linha) => linha.niveis[indice] >= alvoDe(linha.papel, indice)).length;
    const lacuna = linhas.reduce(
      (soma, linha) => soma + Math.max(0, alvoDe(linha.papel, indice) - linha.niveis[indice]),
      0,
    );
    return { capacidade, noAlvo, total: linhas.length, lacuna };
  });
  const alvos = linhas.length * capacidades.length;
  const atingidos = porCapacidade.reduce((soma, item) => soma + item.noAlvo, 0);
  const verificadas = linhas.reduce((soma, linha) => soma + linha.verificadas.length, 0);
  return {
    porCapacidade,
    percentualNoAlvo: alvos ? Math.round((atingidos / alvos) * 100) : 0,
    maiorLacuna: [...porCapacidade].sort((a, b) => b.lacuna - a.lacuna)[0],
    verificadas,
    prontas: linhas.filter((linha) =>
      linha.niveis.every((nivel, indice) => nivel >= alvoDe(linha.papel, indice)),
    ).length,
  };
}

export function exportarCsv(linhas: LinhaTime[]): string {
  const cabecalho = ["pessoa", "papel", ...capacidades.flatMap((capacidade) => [capacidade.id, `${capacidade.id}_alvo`])];
  const corpo = linhas.map((linha) => [
    linha.nome,
    papelPorId[linha.papel].nome,
    ...linha.niveis.flatMap((nivel, indice) => [nivel, alvoDe(linha.papel, indice)]),
  ]);
  return [cabecalho, ...corpo]
    .map((campos) => campos.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
