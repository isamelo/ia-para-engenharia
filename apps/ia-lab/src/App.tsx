import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { curriculum } from "./data/curriculum";
import type { Lesson, Level } from "./data/types";
import {
  completeLesson,
  getLessonCode,
  getProgress,
  isLessonCompleted,
  resetProgress,
  saveLessonCode,
} from "./data/progress";
import { useSandbox } from "./hooks/useSandbox";
import type { SandboxResult, SandboxStatus } from "./sandbox/types";

const lessonPath = (lessonId: string) => `/licao/${lessonId}`;
const lessons = curriculum.flatMap((level) =>
  level.lessons.map((lesson) => ({ lesson, level })),
);

function getOverallProgress() {
  const completed = getProgress().completedLessonIds;
  const available = lessons.map(({ lesson }) => lesson.id);
  const validCompleted = available.filter((id) => completed.includes(id));
  return {
    completed: validCompleted.length,
    total: available.length,
    percent: available.length
      ? Math.round((validCompleted.length / available.length) * 100)
      : 0,
  };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" aria-label={`${value}% concluído`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function SandboxStatusPill({ status }: { status: SandboxStatus }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" />
      {status === "ready"
        ? "Python pronto"
        : status === "error"
          ? "Falha ao carregar Python"
          : "Carregando Python…"}
    </span>
  );
}

function Header() {
  const [progress, setProgress] = useState(getOverallProgress);

  useEffect(() => {
    const update = () => setProgress(getOverallProgress());
    window.addEventListener("ialab:progress-change", update);
    return () => window.removeEventListener("ialab:progress-change", update);
  }, []);

  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="IA Lab — início">
        <span className="brand-mark">✳</span>
        <span>IA <strong>Lab</strong></span>
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <NavLink to="/" end>Trilha</NavLink>
        <NavLink to="/sandbox">Sandbox</NavLink>
        <NavLink to="/progresso">Progresso</NavLink>
      </nav>
      <Link className="header-progress" to="/progresso">
        <span className="header-progress-copy">
          <span>SEU PROGRESSO</span>
          <strong>{progress.percent}%</strong>
        </span>
        <span className="header-progress-track">
          <span style={{ width: `${progress.percent}%` }} />
        </span>
      </Link>
    </header>
  );
}

function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-container"><Outlet /></main>
      <footer className="site-footer">
        <span>IA Lab</span>
        <span>Aprender fazendo, uma linha de cada vez.</span>
      </footer>
    </div>
  );
}

function HomePage() {
  const progress = getOverallProgress();
  const nextLesson = lessons.find(
    ({ lesson }) => !isLessonCompleted(lesson.id),
  );

  return (
    <div className="home-page">
      <section className="hero-card">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-line" /> SUA JORNADA COMEÇA AQUI</div>
          <h1>Entenda IA.<br /><span>Construa o futuro.</span></h1>
          <p>
            Uma trilha prática do primeiro código aos sistemas inteligentes.
            Aprenda os conceitos e experimente Python sem sair do navegador.
          </p>
          <div className="hero-actions">
            {nextLesson ? (
              <Link className="button button-primary" to={lessonPath(nextLesson.lesson.id)}>
                {progress.completed ? "Continuar aprendendo" : "Começar a trilha"}
                <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link className="button button-primary" to="/progresso">
                Trilha concluída <span aria-hidden="true">✓</span>
              </Link>
            )}
            <span className="hero-note"><span className="sparkle">✦</span> Do zero ao avançado</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orb orb-large" />
          <div className="orb orb-small" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-code-card">
            <div className="window-dots"><i /><i /><i /></div>
            <span className="code-muted"># seu próximo passo</span>
            <span><b>modelo</b> = <em>aprender</em>()</span>
            <span><b>futuro</b> = modelo.<em>prever</em>()</span>
            <span className="code-output">✦ criando possibilidades</span>
          </div>
          <div className="visual-caption">IDEIAS EM MOVIMENTO <span>✳</span></div>
        </div>
        <div className="hero-bottom">
          <div className="hero-stat"><strong>{curriculum.length.toString().padStart(2, "0")}</strong><span>níveis para explorar</span></div>
          <div className="hero-stat"><strong>{progress.total.toString().padStart(2, "0")}</strong><span>lições práticas</span></div>
          <div className="hero-stat"><strong>100%</strong><span>no seu ritmo</span></div>
          <div className="hero-scroll">ROLE PARA DESCOBRIR <span>↓</span></div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A TRILHA</div>
            <h2>Conhecimento que <span>vira prática.</span></h2>
          </div>
          <p>Uma jornada progressiva, com teoria na medida e código de verdade.</p>
        </div>
        <div className="level-grid">
          {curriculum.map((level) => (
            <LevelCard key={level.id} level={level} />
          ))}
        </div>
      </section>
      <section className="practice-callout">
        <div className="callout-symbol">⌘</div>
        <div>
          <div className="eyebrow">MÃO NA MASSA</div>
          <h2>Python pronto para rodar.</h2>
          <p>Um ambiente seguro direto no navegador. Sem instalação, sem barreiras.</p>
        </div>
        <Link className="button button-secondary" to="/sandbox">Conhecer o sandbox <span>↗</span></Link>
      </section>
    </div>
  );
}

function LevelCard({ level }: { level: Level }) {
  const complete = level.lessons.filter((lesson) =>
    isLessonCompleted(lesson.id),
  ).length;
  const percent = level.lessons.length
    ? Math.round((complete / level.lessons.length) * 100)
    : 0;

  return (
    <Link className="level-card" to={`/nivel/${level.id}`}>
      <div className="level-card-top">
        <span className="level-number">{String(level.number).padStart(2, "0")}</span>
        <span className="card-arrow">↗</span>
      </div>
      <div className="level-card-content">
        <div className="level-subtitle">{level.subtitle}</div>
        <h3>{level.title}</h3>
        <p>{level.description}</p>
      </div>
      <div className="level-card-bottom">
        <div className="level-meta">
          <span>{level.lessons.length} {level.lessons.length === 1 ? "lição" : "lições"}</span>
          <span>{complete}/{level.lessons.length} concluídas</span>
        </div>
        <ProgressBar value={percent} />
      </div>
    </Link>
  );
}

function LevelPage() {
  const { levelId } = useParams();
  const level = curriculum.find((item) => item.id === levelId);
  if (!level) return <NotFound />;

  const completed = level.lessons.filter((lesson) =>
    isLessonCompleted(lesson.id),
  ).length;
  const percent = level.lessons.length
    ? Math.round((completed / level.lessons.length) * 100)
    : 0;

  return (
    <div className="content-page">
      <Link className="back-link" to="/">← Todas as trilhas</Link>
      <section className="level-intro">
        <div className="eyebrow">NÍVEL {String(level.number).padStart(2, "0")}</div>
        <h1>{level.title}</h1>
        <p>{level.description}</p>
        <div className="level-progress-summary">
          <ProgressBar value={percent} />
          <span>{completed} de {level.lessons.length} lições concluídas</span>
        </div>
      </section>
      <div className="lesson-list">
        {level.lessons.map((lesson, index) => (
          <LessonRow key={lesson.id} lesson={lesson} index={index} />
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson, index }: { lesson: Lesson; index: number }) {
  const completed = isLessonCompleted(lesson.id);
  return (
    <Link className="lesson-row" to={lessonPath(lesson.id)}>
      <span className={`lesson-index ${completed ? "is-complete" : ""}`}>
        {completed ? "✓" : String(index + 1).padStart(2, "0")}
      </span>
      <span className="lesson-row-copy">
        <strong>{lesson.title}</strong>
        <span>{lesson.summary}</span>
      </span>
      <span className="lesson-minutes">{lesson.minutes} min</span>
      <span className="lesson-row-arrow">↗</span>
    </Link>
  );
}

function LessonPage() {
  const { lessonId } = useParams();
  const index = lessons.findIndex(({ lesson }) => lesson.id === lessonId);
  if (index < 0) return <NotFound />;
  const current = lessons[index];
  return (
    <LessonWorkspace
      key={current.lesson.id}
      {...current}
      previous={lessons[index - 1]?.lesson}
      next={lessons[index + 1]?.lesson}
    />
  );
}

function LessonWorkspace({
  lesson,
  level,
  previous,
  next,
}: {
  lesson: Lesson;
  level: Level;
  previous?: Lesson;
  next?: Lesson;
}) {
  const { status, run } = useSandbox();
  const [tab, setTab] = useState<"theory" | "exercise">("theory");
  const [code, setCode] = useState(() =>
    getLessonCode(lesson.id, lesson.starterCode),
  );
  const [revealedHints, setRevealedHints] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [validated, setValidated] = useState(isLessonCompleted(lesson.id));

  useEffect(() => saveLessonCode(lesson.id, code), [lesson.id, code]);

  async function execute(validate: boolean) {
    setRunning(true);
    setResult(null);
    setValidated(false);
    const output = await run(
      code,
      validate ? lesson.tests : [],
      lesson.packages ?? [],
    );
    setResult(output);
    setRunning(false);
    const passed =
      validate &&
      output.error === null &&
      output.tests.length > 0 &&
      output.tests.every((test) => test.passed);
    if (passed) {
      completeLesson(lesson.id);
      setValidated(true);
    }
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void execute(false);
    }
  }

  function restoreCode() {
    setCode(lesson.starterCode);
    setResult(null);
    setValidated(false);
  }

  function revealSolution() {
    if (window.confirm("Carregar a solução no editor? Seu código atual será substituído.")) {
      setCode(lesson.solution);
      setTab("exercise");
      setResult(null);
    }
  }

  return (
    <div className="lesson-page">
      <div className="lesson-breadcrumbs">
        <Link to="/">Trilha</Link><span>/</span>
        <Link to={`/nivel/${level.id}`}>{level.title}</Link><span>/</span>
        <span>{lesson.title}</span>
      </div>
      <div className="lesson-heading">
        <div>
          <div className="eyebrow">LIÇÃO · {lesson.minutes} MIN</div>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
        <SandboxStatusPill status={status} />
      </div>
      {validated && (
        <div className="success-banner">
          <span className="success-check">✓</span>
          <div><strong>Mandou muito bem!</strong><span>Você concluiu esta lição.</span></div>
          {next && <Link className="button button-primary button-small" to={lessonPath(next.id)}>Próxima lição ↗</Link>}
        </div>
      )}
      <div className="lesson-workspace">
        <section className="lesson-learning panel">
          <div className="tab-bar">
            <button className={tab === "theory" ? "active" : ""} onClick={() => setTab("theory")}>Teoria</button>
            <button className={tab === "exercise" ? "active" : ""} onClick={() => setTab("exercise")}>Exercício</button>
          </div>
          <div className="markdown-content">
            {tab === "theory" ? (
              <MarkdownContent>{lesson.theory}</MarkdownContent>
            ) : (
              <MarkdownContent>{lesson.instructions}</MarkdownContent>
            )}
          </div>
          {tab === "exercise" && (
            <>
              {revealedHints > 0 && (
                <div className="hints-list">
                  {lesson.hints.slice(0, revealedHints).map((hint, index) => (
                    <div className="hint-item" key={`${index}-${hint}`}><span>✦ DICA {index + 1}</span><p>{hint}</p></div>
                  ))}
                </div>
              )}
              <div className="exercise-tools">
                {revealedHints < lesson.hints.length && (
                  <button className="text-button" onClick={() => setRevealedHints((count) => count + 1)}>＋ Mostrar dica</button>
                )}
                <button className="text-button solution-button" onClick={revealSolution}>Ver solução <span>↗</span></button>
              </div>
            </>
          )}
        </section>
        <section className="lesson-coding">
          <div className="panel editor-panel">
            <div className="editor-toolbar">
              <div className="editor-file"><span className="python-mark">Py</span><span>seu_codigo.py</span></div>
              <button className="text-button restore-button" onClick={restoreCode}>↺ Restaurar código inicial</button>
            </div>
            <div className="editor-area" onKeyDownCapture={onEditorKeyDown}>
              <CodeMirror
                value={code}
                height="310px"
                theme="dark"
                extensions={[python()]}
                onChange={(value) => setCode(value)}
                aria-label="Editor de código Python"
              />
            </div>
            <div className="editor-actions">
              <span className="shortcut-hint">⌘/Ctrl + Enter para executar</span>
              <button className="button button-secondary" disabled={running || status !== "ready"} onClick={() => void execute(false)}>
                Executar <span>▶</span>
              </button>
              <button className="button button-primary" disabled={running || status !== "ready"} onClick={() => void execute(true)}>
                Validar <span>✓</span>
              </button>
            </div>
          </div>
          <OutputConsole result={result} running={running} />
          <div className="lesson-navigation">
            {previous ? <Link to={lessonPath(previous.id)}>← Lição anterior</Link> : <span />}
            {next && <Link to={lessonPath(next.id)}>Próxima lição →</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}

function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}

function OutputConsole({
  result,
  running,
}: {
  result: SandboxResult | null;
  running: boolean;
}) {
  return (
    <div className="panel output-panel">
      <div className="output-heading">
        <span className="output-title"><span className="console-icon">›_</span> CONSOLE</span>
        {running ? <span className="running-label"><i /> Executando…</span> : result && <span className="duration-label">{result.durationMs} ms</span>}
      </div>
      <div className="output-body" aria-live="polite">
        {!result && !running && <span className="output-placeholder">A saída do seu programa aparece aqui.</span>}
        {result?.stdout && <pre>{result.stdout}</pre>}
        {result?.stderr && <pre className="console-stderr">{result.stderr}</pre>}
        {result?.error && <pre className="console-error">{result.error}</pre>}
        {result?.tests.map((test) => (
          <div className={`test-result ${test.passed ? "test-passed" : "test-failed"}`} key={test.name}>
            <strong>{test.passed ? "✓" : "✗"} {test.name}</strong>
            {!test.passed && test.message && <span>{test.message}</span>}
          </div>
        ))}
        {result && !result.stdout && !result.stderr && !result.error && !result.tests.length && (
          <span className="output-placeholder">Programa executado sem saída.</span>
        )}
      </div>
    </div>
  );
}

const examples = [
  {
    id: "hello",
    label: "Olá, mundo",
    code: 'print("Olá, mundo!")\nprint("Python direto no navegador.")',
    packages: [] as string[],
  },
  {
    id: "numpy",
    label: "Explorando NumPy",
    code: "import numpy as np\n\nvalores = np.array([4, 8, 15, 16, 23, 42])\nprint(f\"Média: {valores.mean():.1f}\")\nprint(f\"Desvio padrão: {valores.std():.2f}\")",
    packages: ["numpy"],
  },
  {
    id: "neural",
    label: "Rede neural mínima",
    code: "import numpy as np\n\n# Um neurônio: entradas × pesos + viés\nentradas = np.array([0.8, 0.2, 0.9])\npesos = np.array([0.4, 0.7, 0.3])\nsaida = 1 / (1 + np.exp(-(entradas @ pesos - 0.5)))\nprint(f\"Ativação: {saida:.3f}\")",
    packages: ["numpy"],
  },
];

function PlaygroundPage() {
  const { status, run } = useSandbox();
  const [selectedExample, setSelectedExample] = useState(examples[0].id);
  const [code, setCode] = useState(examples[0].code);
  const [numpyEnabled, setNumpyEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const activeExample = examples.find((item) => item.id === selectedExample) ?? examples[0];

  async function execute() {
    setRunning(true);
    setResult(null);
    const output = await run(code, [], numpyEnabled ? ["numpy"] : []);
    setResult(output);
    setRunning(false);
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void execute();
    }
  }

  function selectExample(id: string) {
    const example = examples.find((item) => item.id === id) ?? examples[0];
    setSelectedExample(id);
    setCode(example.code);
    setNumpyEnabled(example.packages.includes("numpy"));
    setResult(null);
  }

  return (
    <div className="content-page playground-page">
      <div className="playground-title-row">
        <div>
          <div className="eyebrow">SEU ESPAÇO DE EXPERIMENTAÇÃO</div>
          <h1>Sandbox <span>Python</span></h1>
          <p>Teste uma ideia, brinque com os dados e veja o que acontece.</p>
        </div>
        <SandboxStatusPill status={status} />
      </div>
      <div className="playground-controls panel">
        <label className="example-select-label" htmlFor="example-select">EXEMPLO</label>
        <select id="example-select" value={selectedExample} onChange={(event) => selectExample(event.target.value)}>
          {examples.map((example) => <option value={example.id} key={example.id}>{example.label}</option>)}
        </select>
        <label className="package-toggle">
          <input type="checkbox" checked={numpyEnabled} onChange={(event) => setNumpyEnabled(event.target.checked)} />
          <span className="toggle-track" />
          <span>Incluir NumPy</span>
        </label>
        <span className="playground-package-note">{activeExample.packages.includes("numpy") ? "Este exemplo usa NumPy" : "Pacotes carregados sob demanda"}</span>
      </div>
      <div className="panel playground-editor-panel">
        <div className="editor-toolbar">
          <div className="editor-file"><span className="python-mark">Py</span><span>experimento.py</span></div>
          <span className="shortcut-hint">⌘/Ctrl + Enter para executar</span>
        </div>
        <div className="editor-area playground-editor" onKeyDownCapture={onEditorKeyDown}>
          <CodeMirror value={code} height="430px" theme="dark" extensions={[python()]} onChange={setCode} aria-label="Editor do sandbox Python" />
        </div>
        <div className="editor-actions playground-actions">
          <span className="playground-safe"><span>●</span> Executado com segurança no navegador</span>
          <button className="button button-primary" disabled={running || status !== "ready"} onClick={() => void execute()}>
            {running ? "Executando…" : "Executar código"} <span>▶</span>
          </button>
        </div>
      </div>
      <OutputConsole result={result} running={running} />
      <p className="sandbox-footnote">O ambiente Python roda localmente em WebAssembly. Seu código não sai do navegador.</p>
    </div>
  );
}

function ProgressPage() {
  const [progress, setProgress] = useState(getProgress);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setProgress(getProgress());
    window.addEventListener("ialab:progress-change", update);
    return () => window.removeEventListener("ialab:progress-change", update);
  }, []);

  const totalLessons = lessons.length;
  const completedIds = new Set(progress.completedLessonIds);
  const percent = totalLessons
    ? Math.round(
        (lessons.filter(({ lesson }) => completedIds.has(lesson.id)).length /
          totalLessons) *
          100,
      )
    : 0;
  const completedCount = lessons.filter(({ lesson }) =>
    completedIds.has(lesson.id),
  ).length;

  function restart() {
    if (window.confirm("Tem certeza? Todo o progresso e os códigos salvos serão apagados.")) {
      resetProgress();
      setProgress(getProgress());
      navigate("/progresso");
    }
  }

  return (
    <div className="content-page progress-page">
      <div className="eyebrow">SUA JORNADA ATÉ AQUI</div>
      <h1>Progresso <span>em movimento.</span></h1>
      <p className="page-lede">Cada pequena descoberta conta. Continue no seu ritmo.</p>
      <section className="progress-overview panel">
        <div className="progress-score"><strong>{percent}<span>%</span></strong><span>da trilha concluída</span></div>
        <div className="progress-overview-detail">
          <div className="progress-overview-head"><span>VISÃO GERAL</span><span>{completedCount} de {totalLessons} lições</span></div>
          <ProgressBar value={percent} />
          <span className="progress-motivation">{percent === 100 ? "Você chegou ao final da trilha. Parabéns!" : "Um passo de cada vez — você está no caminho."}</span>
        </div>
        <div className="progress-emblem">✳</div>
      </section>
      <section className="section-block progress-levels">
        <div className="section-heading">
          <div><div className="eyebrow">DETALHAMENTO</div><h2>Seu mapa de <span>aprendizado.</span></h2></div>
        </div>
        <div className="progress-level-list">
          {curriculum.map((level) => {
            const done = level.lessons.filter((lesson) =>
              completedIds.has(lesson.id),
            ).length;
            const levelPercent = level.lessons.length
              ? Math.round((done / level.lessons.length) * 100)
              : 0;
            return (
              <div className="progress-level-card panel" key={level.id}>
                <div className="progress-level-top"><span>NÍVEL {String(level.number).padStart(2, "0")}</span><span>{done}/{level.lessons.length}</span></div>
                <h3>{level.title}</h3>
                <ProgressBar value={levelPercent} />
                <div className="progress-lesson-list">
                  {level.lessons.map((lesson) => (
                    <Link to={lessonPath(lesson.id)} key={lesson.id} className="progress-lesson">
                      <span className={`progress-check ${completedIds.has(lesson.id) ? "done" : ""}`}>{completedIds.has(lesson.id) ? "✓" : "·"}</span>
                      <span>{lesson.title}</span>
                      <span className="progress-lesson-state">{completedIds.has(lesson.id) ? "Concluída" : "Em aberto"}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="reset-progress-row"><span>Quer recomeçar do zero?</span><button className="text-button" onClick={restart}>Reiniciar progresso</button></div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="not-found">
      <div className="eyebrow">CAMINHO NÃO ENCONTRADO</div>
      <h1>Vamos voltar <span>à trilha.</span></h1>
      <Link className="button button-primary" to="/">Ir para o início ↗</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/nivel/:levelId" element={<LevelPage />} />
        <Route path="/licao/:lessonId" element={<LessonPage />} />
        <Route path="/sandbox" element={<PlaygroundPage />} />
        <Route path="/progresso" element={<ProgressPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
