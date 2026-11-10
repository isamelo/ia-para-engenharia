import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { capacidadePorId } from "../data/capacidades";
import type { ResumoMissao } from "../data/plano";
import type { Evidencia, RegistroMissao } from "../state/estado";
import { formatarData } from "../data/formato";
import { ListaCriterios, Veredito } from "./ui";

export function CabecalhoMissao({
  missao,
  registro,
  children,
}: {
  missao: ResumoMissao;
  registro?: RegistroMissao;
  children?: ReactNode;
}) {
  return (
    <header className="missao-topo">
      <Link className="voltar" to="/missoes">Todas as missões</Link>
      <p className="sobretitulo">
        Missão · {capacidadePorId[missao.capacidade].nome} · {missao.minutos} min
      </p>
      <h1 className="titulo-item">{missao.titulo}</h1>
      <blockquote className="chamado">
        <span>Chamado</span>
        {missao.chamado}
      </blockquote>
      {registro && (
        <p className="nota">
          Melhor resultado:{" "}
          {registro.melhor.nivel >= 2
            ? `nível ${registro.melhor.nivel} verificado em ${formatarData(registro.melhor.em)}`
            : "nível 2 ainda não atingido"}
          {" · "}
          {registro.tentativas} {registro.tentativas === 1 ? "envio" : "envios"}
        </p>
      )}
      {children}
    </header>
  );
}

export function ResultadoMissao({
  evidencia,
  melhor,
  children,
}: {
  evidencia: Evidencia;
  melhor?: number;
  children?: ReactNode;
}) {
  return (
    <div className="painel resultado">
      <Veredito nivel={evidencia.nivel} contexto="missao" melhor={melhor} />
      <ListaCriterios criterios={evidencia.criterios} />
      {children}
      <div className="acoes">
        <Link className="botao secundario" to="/mapa">Ver no meu mapa</Link>
      </div>
    </div>
  );
}
