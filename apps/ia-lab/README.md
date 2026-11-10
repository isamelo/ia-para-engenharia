# IA Lab

O IA Lab é um protótipo de produto para times de engenharia: mede a capacidade de cada pessoa em tarefas práticas de IA, corrigidas por testes, e a desenvolve com missões que reproduzem falhas de sistemas reais. O resultado é um mapa por pessoa e por time, com a evidência de cada nível.

## O que o protótipo tem

- **Mapa de capacidades**: 8 capacidades (fundamentos de LLM, engenharia de contexto, agentes de código, RAG, evals, agentes e ferramentas, segurança, custo) em 4 níveis, com alvo por papel (backend, plataforma e SRE, QA, tech lead).
- **Diagnóstico**: 8 itens curtos, um por capacidade. Cada item é um conserto de código corrigido por testes. O resultado entra no mapa como estimativa.
- **Missões**: 4 cenários de cerca de 25 minutos (RAG que cita política revogada, eval que pega regressão, revisão de PR gerado por agente, ferramenta de reembolso induzida por prompt injection). Concluir uma missão registra o nível como verificado.
- **Plano por lacuna**: ordena as capacidades pela distância do alvo e aponta missão, lições de fundamento e leitura do site.
- **Visão do time**: matriz pessoa por capacidade, dois ciclos de medição e exportação em CSV, com dados fictícios.
- **Fundamentos**: as 17 lições da versão anterior e o sandbox livre.

## Limites desta versão

- Não há contas, organizações nem servidor. O estado fica no `localStorage` do navegador.
- Os modelos de linguagem dos cenários são simulados e determinísticos, para que a correção dê sempre o mesmo resultado.
- A correção roda no navegador. Os testes estão no bundle, então quem abrir o código-fonte consegue lê-los. Esconder os testes exige correção no servidor.
- O sandbox atesta até o nível 3. O nível 4 (define o padrão do time) depende de evidência do trabalho.
- A visão do time usa pessoas e resultados fictícios.

## Como rodar

Requisitos: Node.js 20 ou superior e npm.

```sh
npm ci
npm run dev
```

O Python é executado dentro do navegador com Pyodide (WebAssembly). Na primeira visita, o navegador baixa o runtime e os pacotes solicitados; é necessário acesso à internet para esse carregamento inicial.

## Comandos

```sh
npm run dev                 # servidor local
npm run lint                # ESLint
npm run typecheck           # verificação TypeScript
npm run build               # typecheck e build para hospedagem estática
npm run verify:curriculum   # valida lições, itens do diagnóstico e missões
npx tsx scripts/verify-curriculum.ts --desafios   # só diagnóstico e missões
```

## Organização do código

- `src/data/capacidades.ts`: capacidades, níveis, papéis e alvos.
- `src/data/diagnostico/`: os 8 itens do diagnóstico.
- `src/data/missoes/`: as 4 missões. `revisao.ts` traz o diff, os defeitos e a correção da revisão de PR.
- `src/data/pontuacao.ts`: regra de nível a partir dos critérios.
- `src/data/plano.ts`: mapa e plano por lacuna a partir do estado.
- `src/data/timeDemo.ts`: dados fictícios da visão do time.
- `src/data/curriculum.ts`: as 17 lições de fundamentos.
- `src/state/estado.ts`: estado local (`ialab:v2:*`). O progresso das lições continua em `ialab:progress`.
- `src/pages/` e `src/components/`: telas e componentes.

## Como a correção funciona

Um desafio (`Desafio` em `src/data/types.ts`) tem `cenario`, `starterCode`, `solution`, `solucaoParcial` e `criterios`. O `cenario` é código Python carregado antes do código da pessoa, no mesmo namespace. Cada critério é um teste Python marcado como nível 2 ou 3:

- algum critério de nível 2 falha: nível 1;
- todos os de nível 2 passam e algum de nível 3 falha: nível 2;
- todos passam: nível 3.

A revisão de PR não usa código: a pessoa marca linhas do diff como "bloqueia o merge" ou "pede ajuste". Nível 2 exige ao menos 2 dos 4 defeitos com no máximo 2 bloqueios indevidos; nível 3 exige os 4 com no máximo 1.

## Como adicionar um item ou uma missão

Crie o arquivo em `src/data/diagnostico/` ou `src/data/missoes/` e registre no `index.ts` da pasta. Use o helper `py` de `src/data/py.ts` para escrever o Python sem escapar barras invertidas. Antes de integrar, rode `npm run verify:curriculum`. O verificador exige que:

- `solution` chegue ao nível 3;
- `solucaoParcial` chegue ao nível 2;
- `starterCode` execute sem erro e fique no nível 1;
- existam critérios de nível 2 e de nível 3.

Para lições de fundamentos, edite `src/data/curriculum.ts`. O verificador exige que a solução passe todos os testes e que o código inicial falhe em pelo menos um.

## Arquitetura do sandbox

- `src/sandbox/pyodide.worker.ts` inicializa o Pyodide 0.26.4 em um Web Worker de módulo. O código roda em um namespace novo, com saída padrão e de erro capturadas.
- `src/sandbox/harness.ts` contém o harness Python compartilhado pelo worker e pelo verificador Node. O `prelude` (cenário) é executado antes do código da pessoa. Cada teste recebe uma cópia rasa independente do namespace.
- `src/sandbox/client.ts` mantém um worker singleton e uma fila de execuções. A execução tem limite de 10 segundos; ao excedê-lo, o worker é reiniciado.
- O código não é enviado a um servidor. O runtime e os pacotes vêm do CDN oficial do Pyodide.

## Hospedagem

O roteamento usa `HashRouter` e o Vite gera caminhos relativos (`base: './'`), compatíveis com GitHub Pages e outros hosts estáticos. Publique o conteúdo de `dist/`. No site, o app é servido em `/lab/`; os links de leitura do plano apontam para `../`, a raiz do site.
