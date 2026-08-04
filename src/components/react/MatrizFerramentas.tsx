import { useMemo, useState } from 'react';
import data from '../../data/ferramentas.json';

type Ferramenta = (typeof data.ferramentas)[number];
export default function MatrizFerramentas() {
  const [busca, setBusca] = useState('');
  const [mcp, setMcp] = useState(false);
  const [enterprise, setEnterprise] = useState(false);
  const [ordem, setOrdem] = useState<keyof Ferramenta>('nome');
  const [crescente, setCrescente] = useState(true);
  const alternar = (coluna: keyof Ferramenta) => { if (ordem === coluna) setCrescente(!crescente); else { setOrdem(coluna); setCrescente(true); } };
  const itens = useMemo(() => data.ferramentas.filter((f) => (!mcp || f.suporte_mcp) && (!enterprise || f.opcao_no_train_enterprise) && Object.values(f).some((v) => String(v).toLowerCase().includes(busca.toLowerCase()))).sort((a, b) => String(a[ordem]).localeCompare(String(b[ordem])) * (crescente ? 1 : -1)), [busca, mcp, enterprise, ordem, crescente]);
  return <section className="space-y-4 rounded-xl border border-slate-200 p-5"><h2 className="text-xl font-semibold">Matriz de ferramentas</h2><div className="flex flex-wrap gap-3"><input className="rounded border p-2" placeholder="Buscar ferramenta..." value={busca} onChange={(e) => setBusca(e.target.value)} /><label><input type="checkbox" checked={mcp} onChange={(e) => setMcp(e.target.checked)} /> Suporte a MCP</label><label><input type="checkbox" checked={enterprise} onChange={(e) => setEnterprise(e.target.checked)} /> No-train/enterprise</label></div><p className="text-sm text-slate-600">Atualizado em {data.atualizado_em}.</p><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead><tr>{(['nome', 'modo', 'suporte_mcp', 'opcao_no_train_enterprise', 'preco'] as (keyof Ferramenta)[]).map((coluna) => <th key={coluna} className="cursor-pointer p-2" onClick={() => alternar(coluna)}>{coluna.replaceAll('_', ' ')} {ordem === coluna && (crescente ? '↑' : '↓')}</th>)}</tr></thead><tbody>{itens.map((f) => <tr key={f.nome} className="border-t align-top"><td className="p-2 font-medium">{f.nome}</td><td className="p-2">{f.modo}</td><td className="p-2">{f.suporte_mcp ? 'Sim' : 'Não'}</td><td className="p-2">{f.opcao_no_train_enterprise ? 'Sim' : 'Não'}</td><td className="p-2">{f.preco}</td></tr>)}</tbody></table></div><p className="text-xs text-slate-500">{data.nota}</p></section>;
}
