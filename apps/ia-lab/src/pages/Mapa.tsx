import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NOMES_NIVEL, papeis, papelPorId } from "../data/capacidades";
import { itensDiagnostico } from "../data/diagnostico";
import {
  diagnosticoCompleto,
  diagnosticoIniciado,
  missaoDaCapacidade,
  montarMapa,
  montarPlano,
} from "../data/plano";
import type { LinhaMapa, PassoPlano } from "../data/plano";
import { getProgress } from "../data/progress";
import type { PapelId } from "../data/types";
import { apagarTudo, definirPapel, useEstado } from "../state/estado";
import { BarraNivel, Etiqueta, ListaCriterios } from "../components/ui";
import { formatarData } from "../data/formato";

const ROTULO_ORIGEM = {
  verificado: "Verificado por missão",
  estimado: "Estimado no diagnóstico",
  "sem-evidencia": "Sem evidência",
} as const;

function LinhaCapacidade({ linha }: { linha: LinhaMapa }) {
  const { capacidade, nivel, alvo, origem } = linha;
  const missao = missaoDaCapacidade(capacidade.id);
  return (
    <li className="mapa-linha">
      <div className="mapa-resumo">
        <div className="mapa-nome">
          <h3>{capacidade.nome}</h3>
          <p>{capacidade.resumo}</p>
        </div>
        <div className="mapa-nivel">
          <BarraNivel nivel={nivel} alvo={alvo} />
          <span>
            <strong>Nível {nivel}</strong> · {NOMES_NIVEL[nivel]}
          </span>
          <span className="mapa-alvo">
            {alvo === null
              ? "Sem alvo: escolha um papel"
              : linha.lacuna > 0
                ? `Alvo ${alvo} · falta ${linha.lacuna}`
                : `Alvo ${alvo} · atingido`}
          </span>
        </div>
        <div className="mapa-origem">
          <Etiqueta tom={origem === "verificado" ? "ok" : origem === "estimado" ? "atencao" : "neutro"}>
            {ROTULO_ORIGEM[origem]}
          </Etiqueta>
          {linha.demo && <Etiqueta>Resposta de demonstração</Etiqueta>}
        </div>
      </div>
      <details className="mapa-detalhe">
        <summary>Níveis e evidências</summary>
        <ol className="niveis">
          {capacidade.niveis.map((descricao, indice) => (
            <li key={descricao} className={indice + 1 === nivel ? "atual" : ""}>
              <strong>Nível {indice + 1}</strong>
              <span>{descricao}</span>
              {indice + 1 === alvo && <Etiqueta tom="destaque">Alvo do papel</Etiqueta>}
            </li>
          ))}
        </ol>
        {linha.diagnostico && (
          <div className="evidencia">
            <h4>
              Diagnóstico · {formatarData(linha.diagnostico.em)} ·{" "}
              {linha.diagnostico.nivel === 0 ? "item pulado" : `nível ${linha.diagnostico.nivel} estimado`}
            </h4>
            {linha.diagnostico.criterios.length > 0 && (
              <ListaCriterios criterios={linha.diagnostico.criterios} />
            )}
          </div>
        )}
        {linha.missao && missao && (
          <div className="evidencia">
            <h4>
              Missão “{missao.titulo}” · {formatarData(linha.missao.em)} ·{" "}
              {linha.missao.nivel >= 2 ? `nível ${linha.missao.nivel} verificado` : "nível 2 não atingido"}
            </h4>
            <ListaCriterios criterios={linha.missao.criterios} />
          </div>
        )}
        {!linha.diagnostico && !linha.missao && (
          <p className="nota">Ainda não há evidência para esta capacidade.</p>
        )}
      </details>
    </li>
  );
}

function Passo({ passo, posicao }: { passo: PassoPlano; posicao: number }) {
  const { linha, missao, licoes } = passo;
  const { capacidade } = linha;
  const tentou = Boolean(linha.missao);
  return (
    <li className="plano-passo">
      <span className="passo-numero">{posicao}</span>
      <div>
        <h3>{capacidade.nome}</h3>
        <p className="plano-meta">
          Do nível {linha.nivel} para o nível {linha.alvo}. No alvo: {capacidade.niveis[(linha.alvo ?? 1) - 1]}.
        </p>
        <ul className="plano-acoes">
          {missao ? (
            <li>
              <span className="plano-tipo">Missão</span>
              <span>
                <Link to={`/missao/${missao.id}`}>{missao.titulo}</Link> · {missao.minutos} min.{" "}
                {tentou
                  ? "Você já enviou uma resposta; faltam critérios para o nível do alvo."
                  : "Concluir a missão registra o nível como verificado."}
              </span>
            </li>
          ) : (
            <li>
              <span className="plano-tipo">Missão</span>
              <span>Ainda não há missão para esta capacidade neste protótipo. O nível fica como estimado.</span>
            </li>
          )}
          {licoes.length > 0 && (
            <li>
              <span className="plano-tipo">Fundamentos</span>
              <span>
                {licoes.map((licao, indice) => (
                  <span key={licao.id}>
                    {indice > 0 && ", "}
                    <Link to={`/licao/${licao.id}`}>{licao.title}</Link>
                  </span>
                ))}
              </span>
            </li>
          )}
          {capacidade.leitura && (
            <li>
              <span className="plano-tipo">Leitura</span>
              <a href={`../${capacidade.leitura.caminho}`}>{capacidade.leitura.titulo}</a>
            </li>
          )}
        </ul>
      </div>
    </li>
  );
}

export function Mapa() {
  const estado = useEstado();
  const [concluidas, setConcluidas] = useState(() => getProgress().completedLessonIds);

  useEffect(() => {
    const atualizar = () => setConcluidas(getProgress().completedLessonIds);
    window.addEventListener("ialab:progress-change", atualizar);
    return () => window.removeEventListener("ialab:progress-change", atualizar);
  }, []);

  const mapa = montarMapa(estado);
  const plano = montarPlano(mapa, concluidas);
  const iniciado = diagnosticoIniciado(estado);
  const completo = diagnosticoCompleto(estado);
  const respondidos = itensDiagnostico.filter((item) => estado.diagnostico[item.capacidade]).length;
  const noAlvo = mapa.filter((linha) => linha.alvo !== null && linha.lacuna === 0).length;
  const verificadas = mapa.filter((linha) => linha.origem === "verificado").length;
  const temDados = iniciado || Object.keys(estado.missoes).length > 0;

  return (
    <div className="pagina">
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Meu mapa</p>
          <h1>Capacidade em IA, por evidência.</h1>
        </div>
        <label className="campo">
          <span>Papel</span>
          <select
            value={estado.papel ?? ""}
            onChange={(evento) => definirPapel(evento.target.value as PapelId)}
          >
            <option value="" disabled>Escolha um papel</option>
            {papeis.map((papel) => (
              <option key={papel.id} value={papel.id}>{papel.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {!completo && (
        <div className="painel chamada">
          <div>
            <strong>
              {iniciado
                ? `Diagnóstico em andamento: ${respondidos} de ${itensDiagnostico.length} itens.`
                : "Você ainda não fez o diagnóstico."}
            </strong>
            <span>
              {iniciado
                ? "O mapa mostra os itens já respondidos e o que foi verificado em missões. As outras capacidades ficam sem evidência até você concluir."
                : "Sem o diagnóstico, o mapa só mostra o que foi verificado em missões."}
            </span>
          </div>
          <Link className="botao primario" to="/diagnostico">
            {iniciado ? "Continuar o diagnóstico" : "Fazer o diagnóstico"}
          </Link>
        </div>
      )}

      {estado.papel && temDados && (
        <dl className="indicadores">
          <div>
            <dt>No alvo de {papelPorId[estado.papel].nome}</dt>
            <dd>{noAlvo} <span>de {mapa.length} capacidades</span></dd>
          </div>
          <div>
            <dt>Verificadas por missão</dt>
            <dd>{verificadas} <span>de {mapa.length}</span></dd>
          </div>
          <div>
            <dt>Lacunas no plano</dt>
            <dd>{plano.length}</dd>
          </div>
        </dl>
      )}

      <section className="secao">
        <h2>Capacidades</h2>
        <ul className="mapa">
          {mapa.map((linha) => (
            <LinhaCapacidade key={linha.capacidade.id} linha={linha} />
          ))}
        </ul>
        <p className="nota">
          O nível 4 depende de evidência do trabalho no time e não é atestado pelo sandbox.
        </p>
      </section>

      <section className="secao">
        <h2>Plano por lacuna</h2>
        {!estado.papel ? (
          <p className="secao-lede">Escolha um papel para comparar seu nível com o alvo e montar o plano.</p>
        ) : !temDados ? (
          <p className="secao-lede">O plano é montado a partir do diagnóstico. Sem ele, todas as capacidades estariam na lista.</p>
        ) : plano.length === 0 ? (
          <p className="secao-lede">
            Você está no alvo de {papelPorId[estado.papel].nome} em todas as capacidades.
            {verificadas < mapa.length && " As missões transformam os níveis estimados em verificados."}
          </p>
        ) : (
          <>
            <p className="secao-lede">
              Em ordem de distância do alvo de {papelPorId[estado.papel].nome}. Lições já concluídas não aparecem.
            </p>
            <ol className="plano">
              {plano.map((passo, indice) => (
                <Passo key={passo.linha.capacidade.id} passo={passo} posicao={indice + 1} />
              ))}
            </ol>
          </>
        )}
      </section>

      {temDados && (
        <p className="apagar">
          <button
            className="texto"
            onClick={() => {
              if (window.confirm("Apagar o papel, o diagnóstico e os resultados das missões deste navegador?")) {
                apagarTudo();
              }
            }}
          >
            Apagar meus dados deste navegador
          </button>
        </p>
      )}
    </div>
  );
}
