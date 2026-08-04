import { useMemo, useState } from 'react';
import data from '../../data/modelos.json';

export default function CalculadoraCusto() {
  const [entrada, setEntrada] = useState(2000);
  const [saida, setSaida] = useState(500);
  const [cache, setCache] = useState(0);
  const [volume, setVolume] = useState(10000);
  const setCacheClamped = (valor: number) => setCache(Math.min(100, Math.max(0, valor)));
  const modelos = useMemo(() => data.modelos.map((modelo) => {
    const inputCusto = (entrada * (1 - cache / 100) * modelo.preco_input_usd_por_milhao + entrada * (cache / 100) * (modelo.preco_cache_input_usd_por_milhao ?? modelo.preco_input_usd_por_milhao)) / 1000000;
    const totalUsd = volume * (inputCusto + saida * modelo.preco_output_usd_por_milhao / 1000000);
    return { ...modelo, totalUsd, totalBrl: totalUsd * data.cotacao_usd_brl };
  }).sort((a, b) => a.totalUsd - b.totalUsd), [entrada, saida, cache, volume]);
  const campo = (rotulo: string, valor: number, set: (v: number) => void, sufixo = '', max?: number) => <label className="block text-sm">{rotulo}<span className="mt-1 flex items-center gap-2"><input className="w-full rounded border p-2" type="number" min="0" max={max} value={valor} onChange={(e) => set(Number(e.target.value))} />{sufixo}</span></label>;
  return <section className="space-y-4 rounded-xl border border-slate-200 p-5"><h2 className="text-xl font-semibold">Calculadora de custo</h2><div className="grid gap-3 md:grid-cols-4">{campo('Tokens de entrada por requisição', entrada, setEntrada)}{campo('Tokens de saída por requisição', saida, setSaida)}{campo('Taxa de cache hit', cache, setCacheClamped, '%', 100)}{campo('Requisições por mês', volume, setVolume)}</div><p className="text-sm text-slate-600">Atualizado em {data.atualizado_em}. Cotação usada: R$ {data.cotacao_usd_brl.toFixed(2)} por US$ 1.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Modelo</th><th className="p-2">Provedor</th><th className="p-2">USD/mês</th><th className="p-2">BRL/mês</th></tr></thead><tbody>{modelos.map((m) => <tr key={m.id} className="border-t"><td className="p-2 font-medium">{m.nome}</td><td className="p-2">{m.provedor}</td><td className="p-2">US$ {m.totalUsd.toFixed(2)}</td><td className="p-2">R$ {m.totalBrl.toFixed(2)}</td></tr>)}</tbody></table></div><p className="text-xs text-slate-500">{data.nota}</p></section>;
}
