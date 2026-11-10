import type { Desafio } from "../types";
import { itemAgentesCodigo } from "./agentesCodigo";
import { itemContexto } from "./contexto";
import { itemCusto } from "./custo";
import { itemEvals } from "./evals";
import { itemFerramentas } from "./ferramentas";
import { itemFundamentos } from "./fundamentos";
import { itemRag } from "./rag";
import { itemSeguranca } from "./seguranca";

/** Um item por capacidade, na ordem do mapa. */
export const itensDiagnostico: Desafio[] = [
  itemFundamentos,
  itemContexto,
  itemAgentesCodigo,
  itemRag,
  itemEvals,
  itemFerramentas,
  itemSeguranca,
  itemCusto,
];

export const minutosDiagnostico = itensDiagnostico.reduce(
  (total, item) => total + item.minutos,
  0,
);
