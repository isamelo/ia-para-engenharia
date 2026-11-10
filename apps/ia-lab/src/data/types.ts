export interface TestCase {
  /** Nome exibido ao aluno */
  name: string;
  /** Código Python executado no mesmo namespace do código do aluno. Falha = qualquer exceção (use assert x, "mensagem"). */
  code: string;
}

export interface Lesson {
  id: string;
  title: string;
  /** Resumo curto (1 frase) para cards */
  summary: string;
  /** Minutos estimados */
  minutes: number;
  /** Teoria em Markdown (GFM) */
  theory: string;
  /** Enunciado do exercício em Markdown */
  instructions: string;
  starterCode: string;
  solution: string;
  hints: string[];
  tests: TestCase[];
  /** Pacotes Pyodide necessários (ex.: ["numpy"]) */
  packages?: string[];
}

export interface Level {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  lessons: Lesson[];
}

export type CapacidadeId =
  | "fundamentos"
  | "contexto"
  | "agentes-codigo"
  | "rag"
  | "evals"
  | "ferramentas"
  | "seguranca"
  | "custo";

export type PapelId = "backend" | "plataforma" | "qa" | "techlead";

/** 1 = ainda não demonstrou o nível 2; 2 = aplica com apoio; 3 = aplica com autonomia. */
export type NivelEvidenciado = 1 | 2 | 3;

export interface Capacidade {
  id: CapacidadeId;
  nome: string;
  resumo: string;
  /** Evidência observável dos níveis 1 a 4, nessa ordem. */
  niveis: [string, string, string, string];
  /** Lições da base de fundamentos que reforçam esta capacidade. */
  licoes: string[];
  /** Leitura no site IA para Engenharia (caminho relativo à raiz do site). */
  leitura?: { titulo: string; caminho: string };
}

export interface Papel {
  id: PapelId;
  nome: string;
  descricao: string;
  alvo: Record<CapacidadeId, number>;
}

export interface Criterio {
  /** Critério exibido ao participante; não revela a entrada usada. */
  name: string;
  /** Código Python executado no namespace do cenário + código do participante. */
  code: string;
  /** Nível que este critério ajuda a evidenciar. */
  nivel: 2 | 3;
}

export interface Desafio {
  id: string;
  capacidade: CapacidadeId;
  titulo: string;
  minutos: number;
  /** Contexto e tarefa, em Markdown. */
  briefing: string;
  /** Código do cenário: roda antes do código do participante e fica visível só para leitura. */
  cenario: string;
  starterCode: string;
  solution: string;
  /** Solução incompleta usada pelo verificador: deve evidenciar exatamente o nível 2. */
  solucaoParcial?: string;
  criterios: Criterio[];
  packages?: string[];
}

export interface Missao extends Desafio {
  resumo: string;
  /** Sintoma relatado, exibido no topo do briefing. */
  chamado: string;
}

export interface ResultadoCriterio {
  name: string;
  nivel: 2 | 3;
  passed: boolean;
  message: string;
}
