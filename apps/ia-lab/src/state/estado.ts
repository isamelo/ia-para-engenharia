import { useSyncExternalStore } from "react";
import type {
  CapacidadeId,
  NivelEvidenciado,
  PapelId,
  ResultadoCriterio,
} from "../data/types";

const CHAVE = "ialab:v2:estado";
const PREFIXO_CODIGO = "ialab:v2:codigo:";

export interface Evidencia {
  /** 0 = item pulado, sem evidência. */
  nivel: 0 | NivelEvidenciado;
  criterios: ResultadoCriterio[];
  em: string;
  /** Resposta enviada a partir de um atalho de demonstração do protótipo. */
  demo?: boolean;
}

export interface RegistroMissao {
  melhor: Evidencia;
  ultima: Evidencia;
  tentativas: number;
}

export interface Estado {
  papel: PapelId | null;
  diagnostico: Partial<Record<CapacidadeId, Evidencia>>;
  missoes: Record<string, RegistroMissao>;
}

const VAZIO: Estado = { papel: null, diagnostico: {}, missoes: {} };

function ler(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const dados = JSON.parse(bruto) as Partial<Estado> | null;
    if (typeof dados !== "object" || dados === null) return VAZIO;
    return {
      papel: dados.papel ?? null,
      diagnostico: dados.diagnostico ?? {},
      missoes: dados.missoes ?? {},
    };
  } catch {
    return VAZIO;
  }
}

let estado = ler();
const ouvintes = new Set<() => void>();

function atualizar(proximo: Estado) {
  estado = proximo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    // Sem armazenamento disponível, o estado vale só para esta visita.
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useEstado(): Estado {
  return useSyncExternalStore(assinar, () => estado);
}

export function definirPapel(papel: PapelId) {
  atualizar({ ...estado, papel });
}

export function registrarDiagnostico(capacidade: CapacidadeId, evidencia: Evidencia) {
  atualizar({
    ...estado,
    diagnostico: { ...estado.diagnostico, [capacidade]: evidencia },
  });
}

export function reiniciarDiagnostico() {
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith(`${PREFIXO_CODIGO}diag-`))
    .forEach((chave) => localStorage.removeItem(chave));
  atualizar({ ...estado, diagnostico: {} });
}

export function registrarMissao(id: string, evidencia: Evidencia) {
  const anterior = estado.missoes[id];
  const melhor =
    anterior && anterior.melhor.nivel >= evidencia.nivel ? anterior.melhor : evidencia;
  atualizar({
    ...estado,
    missoes: {
      ...estado.missoes,
      [id]: { melhor, ultima: evidencia, tentativas: (anterior?.tentativas ?? 0) + 1 },
    },
  });
}

export function apagarTudo() {
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith("ialab:v2:"))
    .forEach((chave) => localStorage.removeItem(chave));
  atualizar(VAZIO);
}

export function lerRascunho(id: string, padrao: string): string {
  try {
    return localStorage.getItem(`${PREFIXO_CODIGO}${id}`) ?? padrao;
  } catch {
    return padrao;
  }
}

export function salvarRascunho(id: string, codigo: string) {
  try {
    localStorage.setItem(`${PREFIXO_CODIGO}${id}`, codigo);
  } catch {
    // Rascunho não salvo; o editor continua funcionando.
  }
}
