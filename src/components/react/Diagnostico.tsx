import { useEffect, useMemo, useState } from 'react';

type Eixo = 'Fundamentos' | 'Codificação assistida' | 'Avaliação' | 'Produção' | 'Governança';
type Pergunta = { texto: string; eixo: Eixo };
const eixos: Eixo[] = ['Fundamentos', 'Codificação assistida', 'Avaliação', 'Produção', 'Governança'];
const perguntas: Pergunta[] = [
  { texto: 'Consigo explicar limites e capacidades dos modelos que uso.', eixo: 'Fundamentos' },
  { texto: 'Sei preparar contexto e instruções para obter respostas úteis.', eixo: 'Fundamentos' },
  { texto: 'Uso IA para acelerar tarefas de codificação com revisão humana.', eixo: 'Codificação assistida' },
  { texto: 'Tenho um fluxo para pedir, revisar e integrar mudanças geradas.', eixo: 'Codificação assistida' },
  { texto: 'Defino critérios objetivos para avaliar uma saída de IA.', eixo: 'Avaliação' },
  { texto: 'Mantenho exemplos ou testes de regressão para meus prompts.', eixo: 'Avaliação' },
  { texto: 'Consigo operar soluções de IA com observabilidade e custos controlados.', eixo: 'Produção' },
  { texto: 'Tenho planos para falhas, limites e degradação do serviço.', eixo: 'Produção' },
  { texto: 'Sei quais dados podem ser compartilhados com cada ferramenta.', eixo: 'Governança' },
  { texto: 'Documentamos decisões, riscos e responsabilidades no uso de IA.', eixo: 'Governança' },
  { texto: 'As pessoas do time conhecem políticas para uso seguro de IA.', eixo: 'Governança' },
  { texto: 'Reviso resultados de IA antes que afetem usuários ou produção.', eixo: 'Avaliação' },
];

function Radar({ valores }: { valores: number[] }) {
  const pontos = valores.map((valor, i) => {
    const angulo = (Math.PI * 2 * i) / valores.length - Math.PI / 2;
    return `${100 + Math.cos(angulo) * valor * 0.9},${100 + Math.sin(angulo) * valor * 0.9}`;
  }).join(' ');
  return <svg viewBox="0 0 200 200" role="img" aria-label="Radar de maturidade por eixo" className="h-64 w-64">
    <polygon points="100,10 185,72 153,172 47,172 15,72" fill="none" stroke="currentColor" opacity=".25" />
    <polygon points="100,35 163,81 139,154 61,154 37,81" fill="none" stroke="currentColor" opacity=".2" />
    <polygon points={pontos} fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="2" />
    {eixos.map((eixo, i) => { const angulo = (Math.PI * 2 * i) / eixos.length - Math.PI / 2; return <text key={eixo} x={100 + Math.cos(angulo) * 96} y={104 + Math.sin(angulo) * 96} textAnchor="middle" fontSize="7">{eixo.split(' ')[0]}</text>; })}
  </svg>;
}

export default function Diagnostico() {
  const [respostas, setRespostas] = useState<number[]>(() => Array(perguntas.length).fill(0));
  useEffect(() => { const salvo = localStorage.getItem('diagnostico-v1'); if (salvo) try { setRespostas(JSON.parse(salvo)); } catch { /* dados inválidos */ } }, []);
  useEffect(() => { localStorage.setItem('diagnostico-v1', JSON.stringify(respostas)); }, [respostas]);
  const scores = useMemo(() => eixos.map((eixo) => { const itens = perguntas.map((p, i) => p.eixo === eixo ? respostas[i] : null).filter((v): v is number => v !== null); return Math.round((itens.reduce((a, b) => a + b, 0) / (itens.length * 4)) * 100); }), [respostas]);
  const menor = eixos[scores.indexOf(Math.min(...scores))];
  const trilhas: Record<Eixo, string> = { Fundamentos: 'Trilha de fundamentos de IA', 'Codificação assistida': 'Trilha de codificação assistida', Avaliação: 'Trilha de avaliação e testes', Produção: 'Trilha de produção responsável', Governança: 'Trilha de governança de IA' };
  return <section className="space-y-6">
    <div className="space-y-3">{perguntas.map((pergunta, i) => <fieldset key={pergunta.texto} className="rounded-lg border border-slate-200 p-3"><legend className="text-sm font-medium">{pergunta.texto}</legend><div className="mt-2 flex flex-wrap gap-2 text-xs">{[0, 1, 2, 3, 4].map((valor) => <label key={valor} className="flex items-center gap-1"><input type="radio" name={`pergunta-${i}`} checked={respostas[i] === valor} onChange={() => setRespostas((atual) => atual.map((v, j) => j === i ? valor : v))} />{valor} — {['Ainda não', 'Raramente', 'Às vezes', 'Frequentemente', 'Consistentemente'][valor]}</label>)}</div></fieldset>)}</div>
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-5"><h2 className="text-xl font-semibold">Seu perfil</h2><div className="flex flex-wrap items-center gap-6"><Radar valores={scores} /><div className="space-y-2">{eixos.map((eixo, i) => <p key={eixo}><strong>{eixo}:</strong> {scores[i]}/100</p>)}</div></div><p className="mt-3"><strong>Próximo passo recomendado:</strong> {trilhas[menor]} (eixo mais fraco: {menor}).</p><button type="button" className="mt-4 rounded-md bg-teal-700 px-4 py-2 font-semibold text-white" onClick={() => setRespostas(Array(perguntas.length).fill(0))}>Refazer</button></div>
  </section>;
}
