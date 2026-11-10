import { capacidades, papelPorId } from "./capacidades";
import { curriculum } from "./curriculum";
import { missoesSandbox } from "./missoes";
import { missaoRevisao } from "./missoes/revisao";
import type { Capacidade, CapacidadeId, Lesson, PapelId } from "./types";
import type { Estado, Evidencia } from "../state/estado";

export interface ResumoMissao {
  id: string;
  capacidade: CapacidadeId;
  titulo: string;
  resumo: string;
  chamado: string;
  minutos: number;
  formato: string;
}

export const todasMissoes: ResumoMissao[] = [
  ...missoesSandbox.slice(0, 2).map((missao) => ({ ...missao, formato: "Código Python" })),
  { ...missaoRevisao, formato: "Revisão de diff" },
  ...missoesSandbox.slice(2).map((missao) => ({ ...missao, formato: "Código Python" })),
].map(({ id, capacidade, titulo, resumo, chamado, minutos, formato }) => ({
  id,
  capacidade,
  titulo,
  resumo,
  chamado,
  minutos,
  formato,
}));

export const missaoDaCapacidade = (capacidade: CapacidadeId) =>
  todasMissoes.find((missao) => missao.capacidade === capacidade);

const licaoPorId = new Map<string, Lesson>(
  curriculum.flatMap((nivel) => nivel.lessons.map((licao) => [licao.id, licao] as const)),
);

export type Origem = "verificado" | "estimado" | "sem-evidencia";

export interface LinhaMapa {
  capacidade: Capacidade;
  nivel: number;
  origem: Origem;
  alvo: number | null;
  lacuna: number;
  diagnostico?: Evidencia;
  missao?: Evidencia;
  demo: boolean;
}

export function montarMapa(estado: Estado, papel: PapelId | null = estado.papel): LinhaMapa[] {
  return capacidades.map((capacidade) => {
    const diagnostico = estado.diagnostico[capacidade.id];
    const missao = missaoDaCapacidade(capacidade.id);
    const registro = missao ? estado.missoes[missao.id]?.melhor : undefined;
    const estimado = diagnostico?.nivel ?? 0;
    const verificado = registro && registro.nivel >= 2 ? registro.nivel : 0;
    const nivel = Math.max(estimado, verificado);
    const origem: Origem =
      verificado > 0 && verificado >= estimado
        ? "verificado"
        : diagnostico && diagnostico.nivel > 0
          ? "estimado"
          : "sem-evidencia";
    const alvo = papel ? papelPorId[papel].alvo[capacidade.id] : null;
    const fonte = origem === "verificado" ? registro : diagnostico;
    return {
      capacidade,
      nivel,
      origem,
      alvo,
      lacuna: alvo === null ? 0 : Math.max(0, alvo - nivel),
      diagnostico,
      missao: registro,
      demo: Boolean(fonte?.demo),
    };
  });
}

export interface PassoPlano {
  linha: LinhaMapa;
  missao?: ResumoMissao;
  licoes: Lesson[];
}

/** Plano por lacuna: maior distância do alvo primeiro; empate segue a ordem do mapa. */
export function montarPlano(mapa: LinhaMapa[], licoesConcluidas: string[]): PassoPlano[] {
  return mapa
    .filter((linha) => linha.lacuna > 0)
    .sort((a, b) => b.lacuna - a.lacuna)
    .map((linha) => ({
      linha,
      missao: missaoDaCapacidade(linha.capacidade.id),
      licoes: linha.capacidade.licoes
        .filter((id) => !licoesConcluidas.includes(id))
        .map((id) => licaoPorId.get(id))
        .filter((licao): licao is Lesson => Boolean(licao)),
    }));
}

export const diagnosticoCompleto = (estado: Estado) =>
  capacidades.every((capacidade) => estado.diagnostico[capacidade.id]);

export const diagnosticoIniciado = (estado: Estado) =>
  Object.keys(estado.diagnostico).length > 0;
