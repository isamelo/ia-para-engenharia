import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { capacidadePorId, capacidades, NOME_CURTO } from "../data/capacidades";
import { missoesSandbox } from "../data/missoes";
import { missaoRevisao } from "../data/missoes/revisao";
import { missaoDaCapacidade, todasMissoes } from "../data/plano";
import type { Missao } from "../data/types";
import { registrarMissao, useEstado } from "../state/estado";
import type { Evidencia, RegistroMissao } from "../state/estado";
import { AreaDesafio } from "../components/Desafio";
import { CabecalhoMissao, ResultadoMissao } from "../components/missao";
import { Etiqueta } from "../components/ui";
import { MissaoRevisao } from "./MissaoRevisao";

function EstadoMissao({ registro }: { registro?: RegistroMissao }) {
  if (!registro) return <Etiqueta>Não iniciada</Etiqueta>;
  if (registro.melhor.nivel >= 2) {
    return <Etiqueta tom="ok">Nível {registro.melhor.nivel} verificado</Etiqueta>;
  }
  return <Etiqueta tom="atencao">Enviada · nível 2 não atingido</Etiqueta>;
}

export function Missoes() {
  const estado = useEstado();
  const semMissao = capacidades.filter((capacidade) => !missaoDaCapacidade(capacidade.id));
  return (
    <div className="pagina">
      <p className="sobretitulo">Missões</p>
      <h1>Sistemas que falham como em produção.</h1>
      <p className="lede">
        Cada missão parte de um chamado. Você investiga, corrige e envia. A correção roda em dados
        diferentes dos que aparecem no cenário e registra o nível da capacidade como verificado.
      </p>
      <div className="lista-missoes">
        {todasMissoes.map((missao) => {
          const registro = estado.missoes[missao.id];
          return (
            <Link className="cartao cartao-missao" to={`/missao/${missao.id}`} key={missao.id}>
              <span className="cartao-meta">
                {capacidadePorId[missao.capacidade].nome} · {missao.minutos} min · {missao.formato}
              </span>
              <h2>{missao.titulo}</h2>
              <p>{missao.resumo}</p>
              <span className="cartao-rodape">
                <EstadoMissao registro={registro} />
                {registro && (
                  <span className="nota">
                    {registro.tentativas} {registro.tentativas === 1 ? "envio" : "envios"}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="nota">
        Ainda sem missão neste protótipo: {semMissao.map((capacidade) => NOME_CURTO[capacidade.id]).join(", ")}.
        Nessas capacidades o mapa mostra só a estimativa do diagnóstico.
      </p>
    </div>
  );
}

function MissaoSandbox({ missao }: { missao: Missao }) {
  const estado = useEstado();
  const [ultima, setUltima] = useState<Evidencia | null>(null);
  const resumo = todasMissoes.find((item) => item.id === missao.id)!;
  return (
    <div className="pagina pagina-larga">
      <CabecalhoMissao missao={resumo} registro={estado.missoes[missao.id]} />
      <AreaDesafio
        desafio={missao}
        rotuloEnviar="Enviar para correção"
        aoCorrigir={(evidencia) => {
          registrarMissao(missao.id, evidencia);
          setUltima(evidencia);
        }}
      >
        {ultima && (
          <ResultadoMissao evidencia={ultima} melhor={estado.missoes[missao.id]?.melhor.nivel}>
            <p className="nota">
              A correção usa dados diferentes dos do cenário. As mensagens descrevem o
              comportamento esperado, não o caso de teste.
            </p>
          </ResultadoMissao>
        )}
      </AreaDesafio>
    </div>
  );
}

export function MissaoDetalhe() {
  const { id } = useParams();
  if (id === missaoRevisao.id) return <MissaoRevisao />;
  const missao = missoesSandbox.find((item) => item.id === id);
  if (!missao) {
    return (
      <div className="pagina pagina-estreita">
        <h1>Missão não encontrada.</h1>
        <Link className="botao primario" to="/missoes">Ver as missões</Link>
      </div>
    );
  }
  return <MissaoSandbox key={missao.id} missao={missao} />;
}
