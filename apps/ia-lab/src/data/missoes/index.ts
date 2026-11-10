import type { Missao } from "../types";
import { missaoEvals } from "./evals";
import { missaoRag } from "./rag";
import { missaoSeguranca } from "./seguranca";

/** Missões corrigidas no sandbox Python. A missão de revisão de PR tem correção própria. */
export const missoesSandbox: Missao[] = [missaoRag, missaoEvals, missaoSeguranca];
