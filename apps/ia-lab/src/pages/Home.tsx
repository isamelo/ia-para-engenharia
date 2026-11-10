import { Link } from "react-router-dom";
import { capacidades, NOME_CURTO, papelPorId } from "../data/capacidades";
import { itensDiagnostico, minutosDiagnostico } from "../data/diagnostico";
import { diagnosticoCompleto, diagnosticoIniciado, montarMapa, todasMissoes } from "../data/plano";
import { alvoDe, pessoasDemo } from "../data/timeDemo";
import { useEstado } from "../state/estado";
import { BarraNivel } from "../components/ui";

const PASSOS = [
  {
    titulo: "Diagnóstico",
    texto: `${itensDiagnostico.length} itens curtos, um por capacidade. Cada um é um conserto de código corrigido por testes, sem múltipla escolha.`,
  },
  {
    titulo: "Mapa",
    texto: "O nível de cada capacidade aparece ao lado do alvo do papel: backend, plataforma, QA ou tech lead.",
  },
  {
    titulo: "Missões",
    texto: "Sistemas que falham como em produção. A correção roda em dados que a pessoa não viu e registra o nível como verificado.",
  },
  {
    titulo: "Visão do time",
    texto: "A liderança vê pessoa por capacidade, onde está a maior lacuna e quanto o time evoluiu entre dois ciclos.",
  },
];

export function Home() {
  const estado = useEstado();
  const iniciado = diagnosticoIniciado(estado);
  const completo = diagnosticoCompleto(estado);
  const exemplo = pessoasDemo[1];
  const previa = iniciado
    ? montarMapa(estado).map((linha) => ({
        id: linha.capacidade.id,
        nivel: linha.nivel,
        alvo: linha.alvo,
      }))
    : capacidades.map((capacidade, indice) => ({
        id: capacidade.id,
        nivel: exemplo.ciclos[1][indice],
        alvo: alvoDe(exemplo.papel, indice),
      }));
  const papelPrevia = iniciado ? estado.papel : exemplo.papel;

  return (
    <div className="pagina">
      <section className="abertura">
        <div className="abertura-texto">
          <p className="sobretitulo">Para times de engenharia</p>
          <h1>Saiba o que o seu time consegue fazer com IA.</h1>
          <p className="lede">
            O IA Lab mede a capacidade de cada pessoa em tarefas práticas, corrigidas por testes, e
            a desenvolve com missões que reproduzem falhas de sistemas reais. O resultado é um mapa
            por pessoa e por time, com a evidência de cada nível.
          </p>
          <div className="acoes">
            {completo ? (
              <Link className="botao primario" to="/mapa">Ver meu mapa</Link>
            ) : (
              <Link className="botao primario" to="/diagnostico">
                {iniciado ? "Continuar o diagnóstico" : "Fazer o diagnóstico"}
              </Link>
            )}
            <Link className="botao secundario" to="/time">Ver a visão do time</Link>
          </div>
          <p className="nota">
            {itensDiagnostico.length} itens, cerca de {minutosDiagnostico} minutos. Sem cadastro: o
            Python roda no navegador.
          </p>
        </div>
        <div className="painel previa" aria-label="Prévia do mapa de capacidades">
          <div className="previa-topo">
            <strong>{iniciado ? "Seu mapa" : "Exemplo de mapa"}</strong>
            <span>
              {papelPrevia ? papelPorId[papelPrevia].nome : "Papel não definido"}
              {!iniciado && " · dados fictícios"}
            </span>
          </div>
          <ul className="previa-lista">
            {previa.map((linha) => (
              <li key={linha.id}>
                <span>{NOME_CURTO[linha.id]}</span>
                <BarraNivel nivel={linha.nivel} alvo={linha.alvo} />
                <span className="previa-nivel">{linha.nivel}{linha.alvo ? ` / ${linha.alvo}` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="legenda">
            <span className="legenda-item"><i className="degrau cheio" /> nível evidenciado</span>
            <span className="legenda-item"><i className="degrau falta" /> falta para o alvo</span>
          </p>
        </div>
      </section>

      <section className="secao">
        <h2>Como funciona</h2>
        <ol className="passos">
          {PASSOS.map((passo, indice) => (
            <li key={passo.titulo}>
              <span className="passo-numero">{indice + 1}</span>
              <h3>{passo.titulo}</h3>
              <p>{passo.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="secao">
        <div className="secao-topo">
          <h2>Missões</h2>
          <Link to="/missoes">Ver todas</Link>
        </div>
        <div className="grade-missoes">
          {todasMissoes.map((missao) => (
            <Link className="cartao cartao-missao" to={`/missao/${missao.id}`} key={missao.id}>
              <span className="cartao-meta">
                {NOME_CURTO[missao.capacidade]} · {missao.minutos} min · {missao.formato}
              </span>
              <h3>{missao.titulo}</h3>
              <p>{missao.resumo}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="secao">
        <h2>As oito capacidades do mapa</h2>
        <p className="secao-lede">
          Cada capacidade tem quatro níveis, de reconhecer o conceito a definir o padrão do time. O
          sandbox atesta até o nível 3; o nível 4 depende de evidência do trabalho no time.
        </p>
        <dl className="lista-capacidades">
          {capacidades.map((capacidade) => (
            <div key={capacidade.id}>
              <dt>{capacidade.nome}</dt>
              <dd>{capacidade.resumo}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="secao painel limites">
        <h2>O que este protótipo faz e o que não faz</h2>
        <ul>
          <li>O código roda em Python no navegador (WebAssembly). Nada é enviado a um servidor.</li>
          <li>Os modelos de linguagem dos cenários são simulados e determinísticos, para que a correção dê sempre o mesmo resultado.</li>
          <li>Seu mapa fica salvo neste navegador. A visão do time usa pessoas e resultados fictícios.</li>
          <li>Contas, organizações e correção no servidor, que impede a leitura dos testes, não fazem parte desta versão.</li>
        </ul>
        <p>
          As 17 lições da versão anterior continuam disponíveis em{" "}
          <Link to="/fundamentos">Fundamentos</Link> e entram no plano de quem tem lacuna na base.
        </p>
      </section>
    </div>
  );
}
