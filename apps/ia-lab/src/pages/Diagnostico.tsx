import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { capacidadePorId, NOME_CURTO, papeis } from "../data/capacidades";
import { itensDiagnostico, minutosDiagnostico } from "../data/diagnostico";
import { diagnosticoIniciado } from "../data/plano";
import {
  definirPapel,
  registrarDiagnostico,
  reiniciarDiagnostico,
  useEstado,
} from "../state/estado";
import { AreaDesafio } from "../components/Desafio";
import { ListaCriterios, Veredito } from "../components/ui";

export function SeletorPapel() {
  const estado = useEstado();
  return (
    <fieldset className="papeis">
      <legend>Qual é o seu papel?</legend>
      {papeis.map((papel) => (
        <label key={papel.id} className={estado.papel === papel.id ? "selecionado" : ""}>
          <input
            type="radio"
            name="papel"
            checked={estado.papel === papel.id}
            onChange={() => definirPapel(papel.id)}
          />
          <span>
            <strong>{papel.nome}</strong>
            <span>{papel.descricao}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Diagnostico() {
  const estado = useEstado();
  const navegar = useNavigate();
  const [comecou, setComecou] = useState(() => diagnosticoIniciado(estado));
  const [indice, setIndice] = useState(() =>
    itensDiagnostico.findIndex((item) => !estado.diagnostico[item.capacidade]),
  );

  function refazer() {
    if (window.confirm("Refazer o diagnóstico apaga as respostas e a estimativa atual. Continuar?")) {
      reiniciarDiagnostico();
      setIndice(0);
      setComecou(false);
    }
  }

  if (!estado.papel || !comecou) {
    return (
      <div className="pagina pagina-estreita">
        <p className="sobretitulo">Diagnóstico</p>
        <h1>Oito tarefas curtas para estimar onde você está.</h1>
        <p className="lede">
          Cada item é um trecho de código com um defeito ligado a uma capacidade do mapa. Você
          corrige, executa e envia. A correção é feita por testes, em cerca de{" "}
          {minutosDiagnostico} minutos no total.
        </p>
        <ul className="lista-simples">
          <li>O resultado é uma <strong>estimativa</strong>. O nível só passa a verificado quando você conclui a missão da capacidade.</li>
          <li>Você pode pular um item. A capacidade fica sem evidência e entra no plano.</li>
          <li>Cada item aceita um envio. Use Executar quantas vezes quiser antes de enviar.</li>
          <li>O progresso fica salvo neste navegador; dá para parar e voltar depois.</li>
        </ul>
        <SeletorPapel />
        <div className="acoes">
          <button
            className="botao primario"
            disabled={!estado.papel}
            onClick={() => {
              setComecou(true);
              setIndice((atual) => (atual < 0 ? 0 : atual));
            }}
          >
            Começar o diagnóstico
          </button>
          {!estado.papel && <span className="nota">Escolha um papel para começar.</span>}
        </div>
      </div>
    );
  }

  if (indice < 0 || indice >= itensDiagnostico.length) {
    return (
      <div className="pagina pagina-estreita">
        <p className="sobretitulo">Diagnóstico</p>
        <h1>Diagnóstico concluído.</h1>
        <p className="lede">
          A estimativa de cada capacidade está no seu mapa, ao lado do alvo do papel e do plano
          para fechar as lacunas.
        </p>
        <div className="acoes">
          <Link className="botao primario" to="/mapa">Ver meu mapa</Link>
          <button className="botao secundario" onClick={refazer}>Refazer o diagnóstico</button>
        </div>
      </div>
    );
  }

  const item = itensDiagnostico[indice];
  const capacidade = capacidadePorId[item.capacidade];
  const evidencia = estado.diagnostico[item.capacidade];
  const ultimo = indice === itensDiagnostico.length - 1;

  return (
    <div className="pagina pagina-larga">
      <div className="item-topo">
        <div>
          <p className="sobretitulo">
            Diagnóstico · item {indice + 1} de {itensDiagnostico.length} · {capacidade.nome}
          </p>
          <h1 className="titulo-item">{item.titulo}</h1>
        </div>
        <div className="item-topo-acoes">
          <span className="nota">Cerca de {item.minutos} min</span>
          {!evidencia && (
            <button
              className="texto"
              onClick={() =>
                registrarDiagnostico(item.capacidade, {
                  nivel: 0,
                  criterios: [],
                  em: new Date().toISOString(),
                })
              }
            >
              Pular este item
            </button>
          )}
        </div>
      </div>
      <ol className="trilho" aria-label="Andamento do diagnóstico">
        {itensDiagnostico.map((outro, posicao) => (
          <li
            key={outro.id}
            className={[
              estado.diagnostico[outro.capacidade] ? "feito" : "",
              posicao === indice ? "atual" : "",
            ].join(" ")}
            aria-current={posicao === indice ? "step" : undefined}
          >
            <span>{NOME_CURTO[outro.capacidade]}</span>
          </li>
        ))}
      </ol>

      <AreaDesafio
        key={item.id}
        desafio={item}
        rotuloEnviar="Enviar resposta"
        bloqueado={Boolean(evidencia)}
        aoCorrigir={(resultado) => registrarDiagnostico(item.capacidade, resultado)}
      >
        {evidencia && (
          <div className="painel resultado">
            <Veredito nivel={evidencia.nivel} contexto="diagnostico" />
            {evidencia.criterios.length > 0 && <ListaCriterios criterios={evidencia.criterios} />}
            <div className="acoes">
              <button
                className="botao primario"
                onClick={() => (ultimo ? navegar("/mapa") : setIndice(indice + 1))}
              >
                {ultimo ? "Ver meu mapa" : "Próximo item"}
              </button>
            </div>
          </div>
        )}
      </AreaDesafio>
    </div>
  );
}
