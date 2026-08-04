import { useMemo, useState } from 'react';
import data from '../../data/prompts.json';

export default function BibliotecaPrompts() {
  const [busca, setBusca] = useState('');
  const [tag, setTag] = useState('');
  const tags = [...new Set(data.prompts.flatMap((p) => p.tags))];
  const itens = useMemo(() => data.prompts.filter((p) => (!tag || p.tags.includes(tag)) && `${p.titulo} ${p.prompt} ${p.tags.join(' ')}`.toLowerCase().includes(busca.toLowerCase())), [busca, tag]);
  return <section className="space-y-4 rounded-xl border border-slate-200 p-5"><h2 className="text-xl font-semibold">Biblioteca de prompts</h2><div className="flex flex-wrap gap-3"><input className="rounded border p-2" placeholder="Buscar prompt..." value={busca} onChange={(e) => setBusca(e.target.value)} /><select className="rounded border p-2" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas as tags</option>{tags.map((t) => <option key={t}>{t}</option>)}</select></div><div className="grid gap-4 md:grid-cols-2">{itens.map((p) => <article key={p.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{p.titulo}</h3><button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => navigator.clipboard.writeText(p.prompt)}>Copiar</button></div><p className="mt-2 text-xs text-slate-600">Tags: {p.tags.join(', ')} · Modelo testado: {p.modelo_testado}</p><p className="mt-3 text-sm"><strong>Entrada:</strong> {p.contrato_entrada}</p><p className="text-sm"><strong>Saída:</strong> {p.contrato_saida}</p><pre className="mt-3 whitespace-pre-wrap rounded bg-slate-100 p-3 text-xs">{p.prompt}</pre></article>)}</div><p className="text-xs text-slate-500">Atualizado em {data.atualizado_em}. {data.nota}</p></section>;
}
