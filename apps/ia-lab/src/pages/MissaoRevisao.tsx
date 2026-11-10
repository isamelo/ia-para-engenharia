import { useEffect, useState } from "react";
import {
  cenarioRevisao,
  corrigirRevisao,
  defeitoDoAchado,
  diffLinhas,
  missaoRevisao,
} from "../data/missoes/revisao";
import type { Achado, LinhaDiff, ResumoRevisao, Severidade } from "../data/missoes/revisao";
import { todasMissoes } from "../data/plano";
import { nivelEvidenciado } from "../data/pontuacao";
import { useSandbox } from "../hooks/useSandbox";
import type { SandboxResult } from "../sandbox/types";
import { lerRascunho, registrarMissao, salvarRascunho, useEstado } from "../state/estado";
import type { Evidencia } from "../state/estado";
import { CabecalhoMissao, ResultadoMissao } from "../components/missao";
import { Console, Editor, Markdown, StatusSandbox } from "../components/ui";

interface Marcacao extends Achado {
  chave: string;
}

const CHAVE_RASCUNHO = `${missaoRevisao.id}:achados`;
const ROTULO: Record<Severidade, string> = {
  bloqueia: "Bloqueia o merge",
  ajuste: "Pede ajuste",
};

const arquivos = missaoRevisao.arquivos.map((arquivo) => ({
  nome: arquivo.nome,
  linhas: diffLinhas(arquivo.antes, arquivo.depois),
}));

const chaveDa = (arquivo: string, linha: LinhaDiff) =>
  `${arquivo}:${linha.tipo}:${linha.numAntes ?? linha.numDepois}`;

function lerMarcacoes(): Marcacao[] {
  try {
    const dados: unknown = JSON.parse(lerRascunho(CHAVE_RASCUNHO, "[]"));
    return Array.isArray(dados) ? (dados as Marcacao[]) : [];
  } catch {
    return [];
  }
}

/** Uma linha por defeito, na ordem do gabarito. Usado só pelos atalhos de demonstração. */
function marcacoesDeReferencia(quantidade: number): Marcacao[] {
  return missaoRevisao.defeitos.slice(0, quantidade).flatMap((defeito) => {
    for (const arquivo of arquivos) {
      for (const linha of arquivo.linhas) {
        if (linha.tipo === "igual") continue;
        if (defeitoDoAchado({ arquivo: arquivo.nome, texto: linha.texto })?.id === defeito.id) {
          return [{
            chave: chaveDa(arquivo.nome, linha),
            arquivo: arquivo.nome,
            tipo: linha.tipo,
            texto: linha.texto,
            severidade: "bloqueia" as const,
            nota: "",
          }];
        }
      }
    }
    return [];
  });
}

function FormularioAchado({
  inicial,
  aoSalvar,
  aoRemover,
  aoCancelar,
}: {
  inicial?: Marcacao;
  aoSalvar: (severidade: Severidade, nota: string) => void;
  aoRemover: () => void;
  aoCancelar: () => void;
}) {
  const [severidade, setSeveridade] = useState<Severidade>(inicial?.severidade ?? "bloqueia");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  return (
    <div className="achado-form">
      <fieldset>
        <legend>Como você classifica esta mudança?</legend>
        {(Object.keys(ROTULO) as Severidade[]).map((opcao) => (
          <label key={opcao}>
            <input
              type="radio"
              name="severidade"
              checked={severidade === opcao}
              onChange={() => setSeveridade(opcao)}
            />
            {ROTULO[opcao]}
          </label>
        ))}
      </fieldset>
      <label className="campo">
        <span>Por quê? (opcional, não entra na correção)</span>
        <textarea rows={2} value={nota} onChange={(evento) => setNota(evento.target.value)} />
      </label>
      <div className="acoes">
        <button className="botao primario" onClick={() => aoSalvar(severidade, nota.trim())}>
          {inicial ? "Atualizar achado" : "Registrar achado"}
        </button>
        {inicial && <button className="texto" onClick={aoRemover}>Remover</button>}
        <button className="texto" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

export function MissaoRevisao() {
  const estado = useEstado();
  const { status, run } = useSandbox();
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>(lerMarcacoes);
  const [aberta, setAberta] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [resultado, setResultado] = useState<{ evidencia: Evidencia; resumo: ResumoRevisao } | null>(null);
  const [codigo, setCodigo] = useState(() => lerRascunho(missaoRevisao.id, missaoRevisao.experimento));
  const [executando, setExecutando] = useState(false);
  const [saida, setSaida] = useState<SandboxResult | null>(null);

  useEffect(() => salvarRascunho(CHAVE_RASCUNHO, JSON.stringify(marcacoes)), [marcacoes]);
  useEffect(() => salvarRascunho(missaoRevisao.id, codigo), [codigo]);

  const resumoMissao = todasMissoes.find((missao) => missao.id === missaoRevisao.id)!;
  const bloqueios = marcacoes.filter((marcacao) => marcacao.severidade === "bloqueia").length;

  function alterar(proximas: Marcacao[], porAtalho = false) {
    setMarcacoes(proximas);
    setDemo(porAtalho);
    setResultado(null);
    setAberta(null);
  }

  function enviar() {
    const resumo = corrigirRevisao(marcacoes);
    const evidencia: Evidencia = {
      nivel: nivelEvidenciado(resumo.criterios),
      criterios: resumo.criterios,
      em: new Date().toISOString(),
      ...(demo ? { demo: true } : {}),
    };
    registrarMissao(missaoRevisao.id, evidencia);
    setResultado({ evidencia, resumo });
    setAberta(null);
  }

  async function executar() {
    if (executando || status !== "ready") return;
    setExecutando(true);
    setSaida(null);
    setSaida(await run(codigo, [], [], cenarioRevisao));
    setExecutando(false);
  }

  const faltam = resultado
    ? missaoRevisao.defeitos.length - resultado.resumo.encontrados.length
    : 0;

  return (
    <div className="pagina pagina-larga">
      <CabecalhoMissao missao={resumoMissao} registro={estado.missoes[missaoRevisao.id]} />

      <div className="revisao">
        <div className="revisao-diff">
          <details className="painel briefing-revisao" open>
            <summary>Briefing</summary>
            <Markdown>{missaoRevisao.briefing}</Markdown>
          </details>

          {arquivos.map((arquivo) => (
            <section className="painel diff" key={arquivo.nome} aria-label={`Diff de ${arquivo.nome}`}>
              <h2 className="diff-arquivo">{arquivo.nome}</h2>
              <div className="diff-corpo">
                {arquivo.linhas.map((linha) => {
                  const chave = chaveDa(arquivo.nome, linha);
                  const marcacao = marcacoes.find((item) => item.chave === chave);
                  const clicavel = linha.tipo !== "igual" && linha.texto.trim() !== "";
                  const conteudo = (
                    <>
                      <span className="diff-num">{linha.numAntes ?? ""}</span>
                      <span className="diff-num">{linha.numDepois ?? ""}</span>
                      <span className="diff-sinal" aria-hidden="true">
                        {linha.tipo === "adicionada" ? "+" : linha.tipo === "removida" ? "−" : ""}
                      </span>
                      <code>{linha.texto || " "}</code>
                      {marcacao && (
                        <span className={`diff-marca diff-marca-${marcacao.severidade}`}>
                          {ROTULO[marcacao.severidade]}
                        </span>
                      )}
                    </>
                  );
                  return (
                    <div key={chave} className={`diff-linha diff-${linha.tipo}${marcacao ? " marcada" : ""}`}>
                      {clicavel ? (
                        <button
                          className="diff-conteudo"
                          aria-expanded={aberta === chave}
                          aria-label={`Linha ${linha.tipo}: ${linha.texto.trim()}${marcacao ? `. Achado: ${ROTULO[marcacao.severidade]}` : ""}`}
                          onClick={() => setAberta(aberta === chave ? null : chave)}
                        >
                          {conteudo}
                        </button>
                      ) : (
                        <div className="diff-conteudo">{conteudo}</div>
                      )}
                      {aberta === chave && (
                        <FormularioAchado
                          inicial={marcacao}
                          aoCancelar={() => setAberta(null)}
                          aoRemover={() => alterar(marcacoes.filter((item) => item.chave !== chave))}
                          aoSalvar={(severidade, nota) =>
                            alterar([
                              ...marcacoes.filter((item) => item.chave !== chave),
                              {
                                chave,
                                arquivo: arquivo.nome,
                                tipo: linha.tipo as Achado["tipo"],
                                texto: linha.texto,
                                severidade,
                                nota,
                              },
                            ])
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="painel painel-editor">
            <div className="editor-topo">
              <span className="arquivo">Sandbox para investigar · antes e depois já carregados</span>
              <StatusSandbox status={status} />
            </div>
            <Editor
              valor={codigo}
              aoMudar={setCodigo}
              aoExecutar={() => void executar()}
              altura="220px"
              rotulo="Editor do sandbox de investigação"
            />
            <div className="editor-acoes">
              <button className="texto" onClick={() => setCodigo(missaoRevisao.experimento)}>
                Restaurar exemplo
              </button>
              <span className="espaco" />
              <button
                className="botao secundario"
                disabled={executando || status !== "ready"}
                onClick={() => void executar()}
              >
                Executar
              </button>
            </div>
          </section>
          <Console resultado={saida} executando={executando} />
        </div>

        <aside className="revisao-lateral">
          <div className="painel revisao-achados">
            <h2>Sua revisão</h2>
            {marcacoes.length === 0 ? (
              <p className="nota">Clique em uma linha alterada do diff para registrar um achado.</p>
            ) : (
              <ul className="achados">
                {marcacoes.map((marcacao) => (
                  <li key={marcacao.chave}>
                    <span className={`diff-marca diff-marca-${marcacao.severidade}`}>
                      {ROTULO[marcacao.severidade]}
                    </span>
                    <code>{marcacao.texto.trim()}</code>
                    <span className="achado-arquivo">{marcacao.arquivo}</span>
                    {marcacao.nota && <span className="achado-nota">{marcacao.nota}</span>}
                    <button
                      className="texto"
                      onClick={() => alterar(marcacoes.filter((item) => item.chave !== marcacao.chave))}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="nota">
              {bloqueios} {bloqueios === 1 ? "bloqueio" : "bloqueios"} · {marcacoes.length - bloqueios}{" "}
              {marcacoes.length - bloqueios === 1 ? "pedido de ajuste" : "pedidos de ajuste"}
            </p>
            <button className="botao primario" disabled={bloqueios === 0} onClick={enviar}>
              Enviar revisão
            </button>
            <div className="atalhos">
              <span>Atalhos do protótipo, para demonstração:</span>
              <button className="texto" onClick={() => alterar(marcacoesDeReferencia(2), true)}>
                marcar 2 defeitos
              </button>
              <button className="texto" onClick={() => alterar(marcacoesDeReferencia(4), true)}>
                marcar os 4 defeitos
              </button>
              {marcacoes.length > 0 && (
                <button className="texto" onClick={() => alterar([])}>limpar achados</button>
              )}
            </div>
          </div>

          {resultado && (
            <ResultadoMissao evidencia={resultado.evidencia}>
              {resultado.resumo.encontrados.length > 0 && (
                <div className="defeitos">
                  <h3>Defeitos que você bloqueou</h3>
                  <ul>
                    {missaoRevisao.defeitos
                      .filter((defeito) => resultado.resumo.encontrados.includes(defeito.id))
                      .map((defeito) => (
                        <li key={defeito.id}>
                          <strong>{defeito.titulo}</strong>
                          <span>{defeito.explicacao}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {faltam > 0 && (
                <p>
                  {faltam === 1 ? "Há 1 defeito" : `Há ${faltam} defeitos`} que a sua revisão não
                  bloqueou. Eles não são revelados para que você possa revisar de novo.
                </p>
              )}
              {resultado.resumo.indevidos > 0 && (
                <p>
                  {resultado.resumo.indevidos === 1
                    ? "1 bloqueio foi feito em código correto."
                    : `${resultado.resumo.indevidos} bloqueios foram feitos em código correto.`}
                </p>
              )}
            </ResultadoMissao>
          )}
        </aside>
      </div>
    </div>
  );
}
