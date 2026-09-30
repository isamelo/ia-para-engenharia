# IA Lab

O IA Lab é uma plataforma de aprendizado de inteligência artificial em português, do primeiro contato com Python até conceitos avançados. A trilha combina teoria, exercícios validados automaticamente e um espaço livre para experimentar código.

## Como rodar

Requisitos: Node.js 20 ou superior e npm.

```sh
npm install
npm run dev
```

O Python é executado dentro do navegador com Pyodide (WebAssembly). Na primeira visita, o navegador baixa o runtime e os pacotes solicitados; é necessário acesso à internet para esse carregamento inicial.

## Comandos

```sh
npm run dev                 # servidor local
npm run lint                # ESLint
npm run typecheck           # verificação TypeScript
npm run build               # typecheck e build para hospedagem estática
npm run verify:curriculum   # valida soluções e códigos iniciais
```

## Arquitetura do sandbox

- `src/sandbox/pyodide.worker.ts` inicializa o Pyodide 0.26.4 em um Web Worker de módulo. O código do aluno roda em um namespace novo, com saída padrão e de erro capturadas.
- `src/sandbox/harness.ts` contém o harness Python compartilhado pelo worker e pelo verificador Node. Cada teste recebe uma cópia rasa independente do namespace do aluno.
- `src/sandbox/client.ts` mantém um worker singleton e uma fila de execuções. A execução tem limite de 10 segundos; ao excedê-lo, o worker é reiniciado.
- `src/sandbox` não envia o código do aluno a um servidor. O runtime e os pacotes vêm do CDN oficial do Pyodide.

## Como adicionar níveis e lições

Edite `src/data/curriculum.ts`, que exporta `curriculum` como `Level[]` conforme `src/data/types.ts`. Um nível inclui `id`, `number`, `title`, `subtitle`, `description` e `lessons`. Cada lição deve ter identificador, título, resumo, duração, teoria e instruções em Markdown, `starterCode`, `solution`, `hints` e testes Python. Informe em `packages` os pacotes Pyodide necessários, por exemplo `["numpy"]`.

Antes de integrar uma lição, rode `npm run verify:curriculum`. O verificador exige que a solução passe todos os testes e que o código inicial falhe em pelo menos um. O progresso e os códigos de cada pessoa ficam no `localStorage` com o prefixo `ialab:`.

## Hospedagem

O roteamento usa `HashRouter` e o Vite gera caminhos relativos (`base: './'`), compatíveis com GitHub Pages e outros hosts estáticos. Publique o conteúdo de `dist/`.
