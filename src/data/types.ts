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
