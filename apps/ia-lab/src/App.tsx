import { useEffect } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Diagnostico } from "./pages/Diagnostico";
import { Fundamentos, Licao, SandboxLivre } from "./pages/Fundamentos";
import { Home } from "./pages/Home";
import { Mapa } from "./pages/Mapa";
import { MissaoDetalhe, Missoes } from "./pages/Missoes";
import { Time } from "./pages/Time";

const NAVEGACAO = [
  { para: "/mapa", rotulo: "Meu mapa", prefixos: ["/mapa", "/diagnostico"] },
  { para: "/missoes", rotulo: "Missões", prefixos: ["/missoes", "/missao"] },
  { para: "/fundamentos", rotulo: "Fundamentos", prefixos: ["/fundamentos", "/licao", "/sandbox"] },
  { para: "/time", rotulo: "Time", prefixos: ["/time"] },
];

function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-conteudo">
          <Link to="/" className="marca" aria-label="IA Lab, início">
            IA Lab
          </Link>
          <nav className="navegacao" aria-label="Navegação principal">
            {NAVEGACAO.map((item) => {
              const ativo = item.prefixos.some((prefixo) => pathname.startsWith(prefixo));
              return (
                <Link
                  key={item.para}
                  to={item.para}
                  className={ativo ? "ativo" : ""}
                  aria-current={ativo ? "page" : undefined}
                >
                  {item.rotulo}
                </Link>
              );
            })}
          </nav>
          <a className="topo-site" href="../">
            IA para Engenharia
          </a>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="rodape">
        <div className="rodape-conteudo">
          <span>
            IA Lab, protótipo. O Python roda no seu navegador e os resultados ficam neste
            dispositivo.
          </span>
          <Link to="/sandbox">Sandbox livre</Link>
        </div>
      </footer>
    </div>
  );
}

function NaoEncontrada() {
  return (
    <div className="pagina pagina-estreita">
      <p className="sobretitulo">Página não encontrada</p>
      <h1>Este endereço não existe no IA Lab.</h1>
      <Link className="botao primario" to="/">
        Ir para o início
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/diagnostico" element={<Diagnostico />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/missoes" element={<Missoes />} />
        <Route path="/missao/:id" element={<MissaoDetalhe />} />
        <Route path="/time" element={<Time />} />
        <Route path="/fundamentos" element={<Fundamentos />} />
        <Route path="/licao/:id" element={<Licao />} />
        <Route path="/sandbox" element={<SandboxLivre />} />
        <Route path="/nivel/:id" element={<Navigate to="/fundamentos" replace />} />
        <Route path="/progresso" element={<Navigate to="/fundamentos" replace />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
