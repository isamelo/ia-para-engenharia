# IA para Engenharia

Site público de documentação em **português do Brasil** sobre inteligência artificial aplicada à engenharia de software: trilhas de estudo por papel, fichamentos autorais de fontes de referência, playbooks de engenharia, vitrine de pilots com métricas reais e componentes interativos.

- **Site:** https://isamelo.github.io/ia-para-engenharia
- **Stack:** Astro + Starlight + React (islands) + Tailwind
- **Hospedagem:** GitHub Pages (deploy via GitHub Actions)

## Desenvolvimento local

Requer **Node >= 22** (veja `.nvmrc`).

```bash
nvm use            # ou: nvs use 24
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção em dist/
npm run preview    # pré-visualização do build
```

## IA Lab (sandbox Python)

O app independente fica em `apps/ia-lab` e executa Python no navegador com Pyodide.

```bash
npm ci --prefix apps/ia-lab
npm --prefix apps/ia-lab run dev
npm run build && npm run build:lab
```

No site publicado, o laboratório é servido em `/lab/` (sob a base `/ia-para-engenharia`).

## Licenças

- **Conteúdo:** CC BY 4.0
- **Código:** MIT
