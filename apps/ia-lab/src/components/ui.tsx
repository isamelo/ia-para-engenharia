import type { KeyboardEvent, ReactNode } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NOMES_NIVEL } from "../data/capacidades";
import type { ResultadoCriterio } from "../data/types";
import type { SandboxResult, SandboxStatus } from "../sandbox/types";

const EXTENSOES = [python()];

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prosa">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function StatusSandbox({ status }: { status: SandboxStatus }) {
  const texto =
    status === "ready"
      ? "Python pronto"
      : status === "error"
        ? "Falha ao carregar o Python"
        : "Carregando o Python";
  return (
    <span className={`status status-${status}`} role="status">
      <span className="status-ponto" aria-hidden="true" />
      {texto}
    </span>
  );
}

export function Editor({
  valor,
  aoMudar,
  aoExecutar,
  altura = "340px",
  rotulo,
  somenteLeitura = false,
}: {
  valor: string;
  aoMudar?: (valor: string) => void;
  aoExecutar?: () => void;
  altura?: string;
  rotulo: string;
  somenteLeitura?: boolean;
}) {
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (aoExecutar && (evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
      evento.preventDefault();
      aoExecutar();
    }
  }
  return (
    <div className="editor" onKeyDownCapture={aoTeclar}>
      <CodeMirror
        value={valor}
        height={altura}
        theme="dark"
        extensions={EXTENSOES}
        onChange={aoMudar}
        readOnly={somenteLeitura}
        editable={!somenteLeitura}
        aria-label={rotulo}
      />
    </div>
  );
}

export function Console({
  resultado,
  executando,
  mostrarTestes = true,
}: {
  resultado: SandboxResult | null;
  executando: boolean;
  mostrarTestes?: boolean;
}) {
  const vazio =
    resultado &&
    !resultado.stdout &&
    !resultado.stderr &&
    !resultado.error &&
    !(mostrarTestes && resultado.tests.length);
  return (
    <div className="console">
      <div className="console-topo">
        <span>Saída</span>
        {executando ? <span>Executando…</span> : resultado && <span>{resultado.durationMs} ms</span>}
      </div>
      <div className="console-corpo" aria-live="polite">
        {!resultado && !executando && (
          <span className="console-vazio">A saída do programa aparece aqui.</span>
        )}
        {resultado?.stdout && <pre>{resultado.stdout}</pre>}
        {resultado?.stderr && <pre className="console-aviso">{resultado.stderr}</pre>}
        {resultado?.error && <pre className="console-erro">{resultado.error}</pre>}
        {mostrarTestes &&
          resultado?.tests.map((teste) => (
            <div className={`console-teste ${teste.passed ? "ok" : "falha"}`} key={teste.name}>
              <strong>{teste.passed ? "Passou" : "Falhou"} · {teste.name}</strong>
              {!teste.passed && teste.message && <span>{teste.message}</span>}
            </div>
          ))}
        {vazio && <span className="console-vazio">Programa executado sem saída.</span>}
      </div>
    </div>
  );
}

export function BarraNivel({ nivel, alvo }: { nivel: number; alvo?: number | null }) {
  const descricao =
    `Nível ${nivel} de 4, ${NOMES_NIVEL[nivel].toLowerCase()}` +
    (alvo ? `. Alvo do papel: nível ${alvo}` : "");
  return (
    <span className="barra-nivel" role="img" aria-label={descricao}>
      {[1, 2, 3, 4].map((degrau) => (
        <span
          key={degrau}
          className={[
            "degrau",
            degrau <= nivel ? "cheio" : "",
            alvo === degrau ? "alvo" : "",
            alvo && degrau <= alvo && degrau > nivel ? "falta" : "",
          ].join(" ")}
        />
      ))}
    </span>
  );
}

export function Etiqueta({
  tom = "neutro",
  children,
}: {
  tom?: "neutro" | "ok" | "atencao" | "critico" | "destaque";
  children: ReactNode;
}) {
  return <span className={`etiqueta etiqueta-${tom}`}>{children}</span>;
}

export function ListaCriterios({ criterios }: { criterios: ResultadoCriterio[] }) {
  return (
    <ul className="criterios">
      {criterios.map((criterio) => (
        <li key={criterio.name} className={criterio.passed ? "ok" : "falha"}>
          <span className="criterio-estado">{criterio.passed ? "Passou" : "Falhou"}</span>
          <span className="criterio-texto">
            <strong>{criterio.name}</strong>
            {!criterio.passed && criterio.message && <span>{criterio.message}</span>}
          </span>
          <span className="criterio-nivel">Nível {criterio.nivel}</span>
        </li>
      ))}
    </ul>
  );
}

export function Veredito({
  nivel,
  contexto,
  melhor = nivel,
}: {
  nivel: number;
  contexto: "missao" | "diagnostico";
  melhor?: number;
}) {
  const tom = nivel >= 3 ? "ok" : nivel === 2 ? "atencao" : "critico";
  const titulo =
    nivel === 0
      ? "Item pulado: sem evidência nesta capacidade"
      : nivel === 1
        ? "Os critérios do nível 2 não foram todos atendidos"
        : `Nível ${nivel} ${contexto === "missao" ? "verificado" : "estimado"}: ${NOMES_NIVEL[nivel].toLowerCase()}`;
  return (
    <div className={`veredito veredito-${tom}`} role="status">
      <strong>{titulo}</strong>
      {nivel === 1 && contexto === "diagnostico" && (
        <span>O mapa registra nível 1 (reconhece) até que os critérios do nível 2 passem.</span>
      )}
      {nivel === 1 && contexto === "missao" && melhor < 2 && (
        <span>Este envio não entra no mapa: a missão só registra nível verificado a partir do nível 2.</span>
      )}
      {nivel === 2 && <span>Faltam critérios do nível 3 para evidenciar autonomia.</span>}
      {melhor > nivel && melhor >= 2 && (
        <span>O mapa mantém o melhor resultado desta missão: nível {melhor} verificado.</span>
      )}
    </div>
  );
}
