import { useEffect, useMemo, useState } from 'react';

type Modulo = { id: string; titulo: string };
export default function ProgressoTrilha({ modulos, trilhaId }: { modulos: Modulo[]; trilhaId: string }) {
  const chave = `progresso-${trilhaId}`;
  const [concluidos, setConcluidos] = useState<string[]>([]);
  useEffect(() => { const salvo = localStorage.getItem(chave); if (salvo) try { setConcluidos(JSON.parse(salvo)); } catch { /* dados inválidos */ } }, [chave]);
  useEffect(() => { localStorage.setItem(chave, JSON.stringify(concluidos)); }, [chave, concluidos]);
  const percentual = useMemo(() => modulos.length ? Math.round((concluidos.length / modulos.length) * 100) : 0, [concluidos.length, modulos.length]);
  const exportar = () => { const blob = new Blob([JSON.stringify({ trilhaId, concluidos }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${trilhaId}-progresso.json`; link.click(); URL.revokeObjectURL(url); };
  const importar = (arquivo?: File) => { if (!arquivo) return; const leitor = new FileReader(); leitor.onload = () => { try { const dado = JSON.parse(String(leitor.result)); setConcluidos(dado.concluidos.filter((id: string) => modulos.some((m) => m.id === id))); } catch { alert('Arquivo de progresso inválido.'); } }; leitor.readAsText(arquivo); };
  return <section className="space-y-4 rounded-xl border border-slate-200 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Progresso da trilha</h2><strong>{percentual}%</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-teal-600 transition-all" style={{ width: `${percentual}%` }} /></div>{modulos.map((modulo) => <label key={modulo.id} className="flex items-center gap-3"><input type="checkbox" checked={concluidos.includes(modulo.id)} onChange={(e) => setConcluidos((atual) => e.target.checked ? [...atual, modulo.id] : atual.filter((id) => id !== modulo.id))} />{modulo.titulo}</label>)}<div className="flex gap-2"><button type="button" className="rounded border px-3 py-1" onClick={exportar}>Exportar JSON</button><label className="cursor-pointer rounded border px-3 py-1">Importar JSON<input className="hidden" type="file" accept="application/json" onChange={(e) => importar(e.target.files?.[0])} /></label></div></section>;
}
