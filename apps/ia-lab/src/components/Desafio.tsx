import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { juntarCriterios, nivelEvidenciado } from "../data/pontuacao";
import type { Desafio, ResultadoCriterio } from "../data/types";
import { useSandbox } from "../hooks/useSandbox";
import type { SandboxResult } from "../sandbox/types";
import { lerRascunho, salvarRascunho } from "../state/estado";
import type { Evidencia } from "../state/estado";
import { Console, Editor, Markdown, StatusSandbox } from "./ui";

/**
 * Área de trabalho de um desafio corrigido no sandbox: briefing e arquivos do cenário de um lado,
 * editor e saída do outro. Usada pelo diagnóstico e pelas missões em Python.
 */
export function AreaDesafio({
  desafio,
  rotuloEnviar,
  bloqueado = false,
  aoCorrigir,
  acoesExtras,
  children,
}: {
  desafio: Desafio;
  rotuloEnviar: string;
  /** Depois de enviado no diagnóstico, o item não aceita novo envio. */
  bloqueado?: boolean;
  aoCorrigir: (evidencia: Evidencia) => void;
  acoesExtras?: ReactNode;
  children?: ReactNode;
}) {
  const { status, run } = useSandbox();
  const [aba, setAba] = useState<"briefing" | "cenario">("briefing");
  const [codigo, setCodigo] = useState(() => lerRascunho(desafio.id, desafio.starterCode));
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<SandboxResult | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [atalho, setAtalho] = useState<string | null>(null);

  useEffect(() => salvarRascunho(desafio.id, codigo), [desafio.id, codigo]);

  const ocupado = executando || status !== "ready";

  async function executar() {
    if (ocupado) return;
    setExecutando(true);
    setResultado(null);
    setErroEnvio(null);
    setResultado(await run(codigo, [], desafio.packages ?? [], desafio.cenario));
    setExecutando(false);
  }

  async function enviar() {
    if (ocupado || bloqueado) return;
    setExecutando(true);
    setResultado(null);
    setErroEnvio(null);
    const saida = await run(codigo, desafio.criterios, desafio.packages ?? [], desafio.cenario);
    setResultado(saida);
    setExecutando(false);
    if (saida.error !== null) {
      setErroEnvio("O código gerou um erro antes da correção. Corrija o erro e envie de novo.");
      return;
    }
    const criterios: ResultadoCriterio[] = juntarCriterios(desafio.criterios, saida.tests);
    aoCorrigir({
      nivel: nivelEvidenciado(criterios),
      criterios,
      em: new Date().toISOString(),
      ...(atalho !== null && codigo === atalho ? { demo: true } : {}),
    });
  }

  function carregar(fonte: string) {
    setCodigo(fonte);
    setAtalho(fonte);
    setResultado(null);
    setErroEnvio(null);
  }

  return (
    <div className="area">
      <section className="area-contexto painel">
        <div className="abas" role="tablist">
          <button role="tab" aria-selected={aba === "briefing"} onClick={() => setAba("briefing")}>
            Briefing
          </button>
          <button role="tab" aria-selected={aba === "cenario"} onClick={() => setAba("cenario")}>
            Arquivos do cenário
          </button>
        </div>
        {aba === "briefing" ? (
          <div className="area-rolagem">
            <Markdown>{desafio.briefing}</Markdown>
          </div>
        ) : (
          <div className="area-cenario">
            <p className="nota">
              Este código já está carregado quando o seu roda. Leia para entender o sistema; ele não
              pode ser alterado.
            </p>
            <Editor valor={desafio.cenario} altura="420px" rotulo="Código do cenário" somenteLeitura />
          </div>
        )}
      </section>

      <section className="area-codigo">
        <div className="painel painel-editor">
          <div className="editor-topo">
            <span className="arquivo">resposta.py</span>
            <StatusSandbox status={status} />
          </div>
          <Editor
            valor={codigo}
            aoMudar={bloqueado ? undefined : setCodigo}
            aoExecutar={() => void executar()}
            rotulo="Editor de código Python"
            somenteLeitura={bloqueado}
          />
          <div className="editor-acoes">
            <button
              className="texto"
              disabled={bloqueado}
              onClick={() => {
                if (window.confirm("Voltar ao código inicial? O que você escreveu será apagado.")) {
                  carregar(desafio.starterCode);
                  setAtalho(null);
                }
              }}
            >
              Restaurar código inicial
            </button>
            <span className="espaco" />
            <button className="botao secundario" disabled={ocupado} onClick={() => void executar()}>
              Executar
            </button>
            {!bloqueado && (
              <button className="botao primario" disabled={ocupado} onClick={() => void enviar()}>
                {executando ? "Aguarde…" : rotuloEnviar}
              </button>
            )}
            {acoesExtras}
          </div>
        </div>

        {!bloqueado && (
          <div className="atalhos">
            <span>Atalhos do protótipo, para demonstração:</span>
            {desafio.solucaoParcial && (
              <button className="texto" onClick={() => carregar(desafio.solucaoParcial!)}>
                carregar resposta parcial
              </button>
            )}
            <button className="texto" onClick={() => carregar(desafio.solution)}>
              carregar resposta de referência
            </button>
          </div>
        )}

        {erroEnvio && <div className="aviso aviso-critico" role="alert">{erroEnvio}</div>}
        {children}
        <Console resultado={resultado} executando={executando} mostrarTestes={false} />
      </section>
    </div>
  );
}
