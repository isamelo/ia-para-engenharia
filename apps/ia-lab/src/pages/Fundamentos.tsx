import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { curriculum } from "../data/curriculum";
import {
  completeLesson,
  getLessonCode,
  getProgress,
  resetProgress,
  saveLessonCode,
} from "../data/progress";
import type { Lesson, Level } from "../data/types";
import { useSandbox } from "../hooks/useSandbox";
import type { SandboxResult } from "../sandbox/types";
import { Console, Editor, Markdown, StatusSandbox } from "../components/ui";

const licoes = curriculum.flatMap((nivel) => nivel.lessons.map((licao) => ({ licao, nivel })));

function useConcluidas() {
  const [concluidas, setConcluidas] = useState(() => getProgress().completedLessonIds);
  useEffect(() => {
    const atualizar = () => setConcluidas(getProgress().completedLessonIds);
    window.addEventListener("ialab:progress-change", atualizar);
    return () => window.removeEventListener("ialab:progress-change", atualizar);
  }, []);
  return concluidas;
}

export function Fundamentos() {
  const concluidas = useConcluidas();
  const feitas = licoes.filter(({ licao }) => concluidas.includes(licao.id)).length;

  return (
    <div className="pagina">
      <p className="sobretitulo">Fundamentos</p>
      <h1>A base por trás das capacidades.</h1>
      <p className="lede">
        {licoes.length} lições com teoria e exercício corrigido, de Python e dados a redes neurais,
        tokens, RAG e agentes. O plano do seu mapa aponta as lições ligadas a cada lacuna; aqui
        está a lista completa.
      </p>
      <p className="nota">
        {feitas} de {licoes.length} lições concluídas ·{" "}
        <Link to="/sandbox">abrir o sandbox livre</Link>
      </p>

      {curriculum.map((nivel) => (
        <section className="secao nivel" key={nivel.id}>
          <div className="nivel-topo">
            <h2>
              <span>{nivel.number}</span> {nivel.title}
            </h2>
            <p>{nivel.description}</p>
          </div>
          <ul className="licoes">
            {nivel.lessons.map((licao) => {
              const feita = concluidas.includes(licao.id);
              return (
                <li key={licao.id}>
                  <Link to={`/licao/${licao.id}`}>
                    <span className={`licao-estado${feita ? " feita" : ""}`}>
                      {feita ? "Concluída" : "Em aberto"}
                    </span>
                    <span className="licao-texto">
                      <strong>{licao.title}</strong>
                      <span>{licao.summary}</span>
                    </span>
                    <span className="licao-min">{licao.minutes} min</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {feitas > 0 && (
        <p className="apagar">
          <button
            className="texto"
            onClick={() => {
              if (window.confirm("Apagar o progresso e os códigos salvos das lições?")) resetProgress();
            }}
          >
            Reiniciar o progresso das lições
          </button>
        </p>
      )}
    </div>
  );
}

export function Licao() {
  const { id } = useParams();
  const indice = licoes.findIndex(({ licao }) => licao.id === id);
  if (indice < 0) {
    return (
      <div className="pagina pagina-estreita">
        <h1>Lição não encontrada.</h1>
        <Link className="botao primario" to="/fundamentos">Ver os fundamentos</Link>
      </div>
    );
  }
  const atual = licoes[indice];
  return (
    <AreaLicao
      key={atual.licao.id}
      licao={atual.licao}
      nivel={atual.nivel}
      anterior={licoes[indice - 1]?.licao}
      proxima={licoes[indice + 1]?.licao}
    />
  );
}

function AreaLicao({
  licao,
  nivel,
  anterior,
  proxima,
}: {
  licao: Lesson;
  nivel: Level;
  anterior?: Lesson;
  proxima?: Lesson;
}) {
  const { status, run } = useSandbox();
  const concluidas = useConcluidas();
  const [aba, setAba] = useState<"teoria" | "exercicio">("teoria");
  const [codigo, setCodigo] = useState(() => getLessonCode(licao.id, licao.starterCode));
  const [dicas, setDicas] = useState(0);
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<SandboxResult | null>(null);
  const concluida = concluidas.includes(licao.id);
  const ocupado = executando || status !== "ready";

  useEffect(() => {
    saveLessonCode(licao.id, codigo);
  }, [licao.id, codigo]);

  async function executar(validar: boolean) {
    if (ocupado) return;
    setExecutando(true);
    setResultado(null);
    const saida = await run(codigo, validar ? licao.tests : [], licao.packages ?? []);
    setResultado(saida);
    setExecutando(false);
    if (
      validar &&
      saida.error === null &&
      saida.tests.length > 0 &&
      saida.tests.every((teste) => teste.passed)
    ) {
      completeLesson(licao.id);
    }
  }

  return (
    <div className="pagina pagina-larga">
      <header className="missao-topo">
        <Link className="voltar" to="/fundamentos">Fundamentos</Link>
        <p className="sobretitulo">
          Nível {nivel.number} · {nivel.title} · {licao.minutes} min
        </p>
        <h1 className="titulo-item">{licao.title}</h1>
        <p className="nota">{licao.summary}</p>
      </header>

      {concluida && (
        <div className="veredito veredito-ok" role="status">
          <strong>Lição concluída.</strong>
          {proxima && <Link to={`/licao/${proxima.id}`}>Ir para a próxima: {proxima.title}</Link>}
        </div>
      )}

      <div className="area">
        <section className="area-contexto painel">
          <div className="abas" role="tablist">
            <button role="tab" aria-selected={aba === "teoria"} onClick={() => setAba("teoria")}>
              Teoria
            </button>
            <button role="tab" aria-selected={aba === "exercicio"} onClick={() => setAba("exercicio")}>
              Exercício
            </button>
          </div>
          <div className="area-rolagem">
            <Markdown>{aba === "teoria" ? licao.theory : licao.instructions}</Markdown>
            {aba === "exercicio" && (
              <>
                {dicas > 0 && (
                  <ol className="dicas">
                    {licao.hints.slice(0, dicas).map((dica) => (
                      <li key={dica}>{dica}</li>
                    ))}
                  </ol>
                )}
                <div className="acoes">
                  {dicas < licao.hints.length && (
                    <button className="texto" onClick={() => setDicas(dicas + 1)}>
                      Mostrar uma dica
                    </button>
                  )}
                  <button
                    className="texto"
                    onClick={() => {
                      if (window.confirm("Carregar a solução no editor? Seu código atual será substituído.")) {
                        setCodigo(licao.solution);
                        setResultado(null);
                      }
                    }}
                  >
                    Ver a solução
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="area-codigo">
          <div className="painel painel-editor">
            <div className="editor-topo">
              <span className="arquivo">seu_codigo.py</span>
              <StatusSandbox status={status} />
            </div>
            <Editor
              valor={codigo}
              aoMudar={setCodigo}
              aoExecutar={() => void executar(false)}
              rotulo="Editor de código Python"
            />
            <div className="editor-acoes">
              <button
                className="texto"
                onClick={() => {
                  setCodigo(licao.starterCode);
                  setResultado(null);
                }}
              >
                Restaurar código inicial
              </button>
              <span className="espaco" />
              <button className="botao secundario" disabled={ocupado} onClick={() => void executar(false)}>
                Executar
              </button>
              <button className="botao primario" disabled={ocupado} onClick={() => void executar(true)}>
                Validar
              </button>
            </div>
          </div>
          <Console resultado={resultado} executando={executando} />
          <nav className="vizinhas" aria-label="Lições vizinhas">
            {anterior ? <Link to={`/licao/${anterior.id}`}>Anterior: {anterior.title}</Link> : <span />}
            {proxima && <Link to={`/licao/${proxima.id}`}>Próxima: {proxima.title}</Link>}
          </nav>
        </section>
      </div>
    </div>
  );
}

const EXEMPLOS = [
  {
    id: "ola",
    rotulo: "Olá, mundo",
    codigo: 'print("Olá, mundo!")\nprint("Python direto no navegador.")',
    numpy: false,
  },
  {
    id: "numpy",
    rotulo: "Estatística com NumPy",
    codigo:
      'import numpy as np\n\nvalores = np.array([4, 8, 15, 16, 23, 42])\nprint(f"Média: {valores.mean():.1f}")\nprint(f"Desvio padrão: {valores.std():.2f}")',
    numpy: true,
  },
  {
    id: "neuronio",
    rotulo: "Um neurônio",
    codigo:
      'import numpy as np\n\n# Um neurônio: entradas × pesos + viés\nentradas = np.array([0.8, 0.2, 0.9])\npesos = np.array([0.4, 0.7, 0.3])\nsaida = 1 / (1 + np.exp(-(entradas @ pesos - 0.5)))\nprint(f"Ativação: {saida:.3f}")',
    numpy: true,
  },
];

export function SandboxLivre() {
  const { status, run } = useSandbox();
  const [exemplo, setExemplo] = useState(EXEMPLOS[0].id);
  const [codigo, setCodigo] = useState(EXEMPLOS[0].codigo);
  const [numpy, setNumpy] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<SandboxResult | null>(null);
  const ocupado = executando || status !== "ready";

  async function executar() {
    if (ocupado) return;
    setExecutando(true);
    setResultado(null);
    setResultado(await run(codigo, [], numpy ? ["numpy"] : []));
    setExecutando(false);
  }

  function escolher(id: string) {
    const escolhido = EXEMPLOS.find((item) => item.id === id) ?? EXEMPLOS[0];
    setExemplo(escolhido.id);
    setCodigo(escolhido.codigo);
    setNumpy(escolhido.numpy);
    setResultado(null);
  }

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Sandbox livre</p>
          <h1>Python no navegador, sem correção.</h1>
        </div>
        <StatusSandbox status={status} />
      </div>
      <div className="sandbox-controles">
        <label className="campo">
          <span>Exemplo</span>
          <select value={exemplo} onChange={(evento) => escolher(evento.target.value)}>
            {EXEMPLOS.map((item) => (
              <option key={item.id} value={item.id}>{item.rotulo}</option>
            ))}
          </select>
        </label>
        <label className="marcar">
          <input type="checkbox" checked={numpy} onChange={(evento) => setNumpy(evento.target.checked)} />
          Carregar NumPy
        </label>
      </div>
      <div className="painel painel-editor">
        <div className="editor-topo">
          <span className="arquivo">experimento.py</span>
          <span className="nota">Ctrl ou ⌘ + Enter executa</span>
        </div>
        <Editor
          valor={codigo}
          aoMudar={setCodigo}
          aoExecutar={() => void executar()}
          altura="380px"
          rotulo="Editor do sandbox Python"
        />
        <div className="editor-acoes">
          <span className="espaco" />
          <button className="botao primario" disabled={ocupado} onClick={() => void executar()}>
            {executando ? "Executando…" : "Executar"}
          </button>
        </div>
      </div>
      <Console resultado={resultado} executando={executando} />
      <p className="nota">
        O código roda em WebAssembly neste dispositivo, com limite de 10 segundos por execução.
      </p>
    </div>
  );
}
