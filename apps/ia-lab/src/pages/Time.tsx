import { useState } from "react";
import { Link } from "react-router-dom";
import { capacidades, NOME_CURTO, papelPorId } from "../data/capacidades";
import { diagnosticoIniciado, missaoDaCapacidade, montarMapa } from "../data/plano";
import { alvoDe, CICLOS, exportarCsv, linhasDoCiclo, resumoDoTime, SQUAD } from "../data/timeDemo";
import type { LinhaTime } from "../data/timeDemo";
import { useEstado } from "../state/estado";

function classeDaCelula(nivel: number, alvo: number) {
  if (nivel >= alvo) return "no-alvo";
  return alvo - nivel === 1 ? "abaixo-1" : "abaixo-2";
}

function baixarCsv(linhas: LinhaTime[], ciclo: number) {
  const url = URL.createObjectURL(new Blob([exportarCsv(linhas)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ia-lab-time-ciclo-${ciclo + 1}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Time() {
  const estado = useEstado();
  const [ciclo, setCiclo] = useState<0 | 1>(1);
  const linhas = linhasDoCiclo(ciclo);
  const resumo = resumoDoTime(linhas);
  const anterior = resumoDoTime(linhasDoCiclo(0));
  const variacao = resumo.percentualNoAlvo - anterior.percentualNoAlvo;

  const mapa = montarMapa(estado);
  const voce: LinhaTime | null =
    estado.papel && (diagnosticoIniciado(estado) || Object.keys(estado.missoes).length > 0)
      ? {
          nome: "Você",
          papel: estado.papel,
          niveis: mapa.map((linha) => linha.nivel),
          verificadas: mapa
            .filter((linha) => linha.origem === "verificado")
            .map((linha) => linha.capacidade.id),
          voce: true,
        }
      : null;
  const tabela = voce ? [voce, ...linhas] : linhas;
  const lacunas = [...resumo.porCapacidade].sort((a, b) => b.lacuna - a.lacuna);

  return (
    <div className="pagina">
      <div className="aviso aviso-demo" role="note">
        <strong>Dados de demonstração.</strong> As pessoas, o squad e os resultados desta página são
        fictícios. No produto, cada linha viria do diagnóstico e das missões de uma pessoa do time.
      </div>

      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Visão do time</p>
          <h1>{SQUAD}</h1>
        </div>
        <div className="alternador" role="group" aria-label="Ciclo de medição">
          {CICLOS.map((rotulo, indice) => (
            <button
              key={rotulo}
              className={ciclo === indice ? "ativo" : ""}
              aria-pressed={ciclo === indice}
              onClick={() => setCiclo(indice as 0 | 1)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      <dl className="indicadores">
        <div>
          <dt>Alvos atingidos</dt>
          <dd>
            {resumo.percentualNoAlvo}%
            {ciclo === 1 && (
              <span>{variacao >= 0 ? "+" : ""}{variacao} pontos desde o ciclo 1</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Pessoas no alvo em tudo</dt>
          <dd>{resumo.prontas} <span>de {linhas.length}</span></dd>
        </div>
        <div>
          <dt>Maior lacuna</dt>
          <dd className="indicador-texto">
            {NOME_CURTO[resumo.maiorLacuna.capacidade.id]}
            <span>{resumo.maiorLacuna.noAlvo} de {resumo.maiorLacuna.total} no alvo</span>
          </dd>
        </div>
        <div>
          <dt>Níveis verificados por missão</dt>
          <dd>{resumo.verificadas} <span>de {linhas.length * capacidades.length}</span></dd>
        </div>
      </dl>

      <section className="secao">
        <div className="secao-topo">
          <h2>Pessoa por capacidade</h2>
          <button className="botao secundario" onClick={() => baixarCsv(linhas, ciclo)}>
            Exportar CSV
          </button>
        </div>
        <div className="matriz-rolagem" tabIndex={0} role="region" aria-label="Matriz de pessoas por capacidade">
          <table className="matriz">
            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                {capacidades.map((capacidade) => (
                  <th scope="col" key={capacidade.id} title={capacidade.nome}>
                    {NOME_CURTO[capacidade.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map((linha) => (
                <tr key={linha.nome} className={linha.voce ? "linha-voce" : ""}>
                  <th scope="row">
                    <strong>{linha.nome}</strong>
                    <span>{papelPorId[linha.papel].nome}{linha.voce && " · este navegador"}</span>
                  </th>
                  {linha.niveis.map((nivel, indice) => {
                    const alvo = alvoDe(linha.papel, indice);
                    const verificada = linha.verificadas.includes(capacidades[indice].id);
                    return (
                      <td key={capacidades[indice].id} className={classeDaCelula(nivel, alvo)}>
                        <span
                          className="celula"
                          aria-label={`Nível ${nivel}, alvo ${alvo}${verificada ? ", verificado por missão" : ""}`}
                        >
                          <strong>{nivel}</strong>
                          <span>/{alvo}</span>
                          {verificada && <i className="celula-verificada" title="Verificado por missão" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="legenda">
          <span className="legenda-item"><i className="amostra no-alvo" /> no alvo do papel</span>
          <span className="legenda-item"><i className="amostra abaixo-1" /> 1 nível abaixo</span>
          <span className="legenda-item"><i className="amostra abaixo-2" /> 2 ou mais abaixo</span>
          <span className="legenda-item"><i className="celula-verificada" /> verificado por missão</span>
          <span className="legenda-item">nível / alvo</span>
        </p>
        {voce ? (
          <p className="nota">Sua linha vem do seu mapa e não entra nos totais do squad de demonstração.</p>
        ) : (
          <p className="nota">
            <Link to="/diagnostico">Faça o diagnóstico</Link> para ver a sua linha ao lado do squad de demonstração.
          </p>
        )}
      </section>

      <section className="secao">
        <h2>Onde investir primeiro</h2>
        <p className="secao-lede">
          Capacidades ordenadas pela soma dos níveis que faltam para o alvo de cada pessoa.
        </p>
        <ul className="lacunas">
          {lacunas.map((item) => {
            const missao = missaoDaCapacidade(item.capacidade.id);
            return (
              <li key={item.capacidade.id}>
                <div className="lacuna-nome">
                  <strong>{item.capacidade.nome}</strong>
                  <span>
                    {item.noAlvo} de {item.total} no alvo · faltam {item.lacuna}{" "}
                    {item.lacuna === 1 ? "nível" : "níveis"} no total
                  </span>
                </div>
                <div className="lacuna-barra" aria-hidden="true">
                  <span style={{ width: `${(item.noAlvo / item.total) * 100}%` }} />
                </div>
                <div className="lacuna-acao">
                  {item.lacuna === 0 ? (
                    <span className="nota">Sem lacuna</span>
                  ) : missao ? (
                    <Link to={`/missao/${missao.id}`}>Missão: {missao.titulo}</Link>
                  ) : (
                    <span className="nota">Sem missão neste protótipo</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
