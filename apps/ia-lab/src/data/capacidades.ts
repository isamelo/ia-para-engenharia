import type { Capacidade, CapacidadeId, Papel, PapelId } from "./types";

export const NOMES_NIVEL = [
  "Sem evidência",
  "Reconhece",
  "Aplica com apoio",
  "Aplica com autonomia",
  "Define o padrão do time",
] as const;

export const capacidades: Capacidade[] = [
  {
    id: "fundamentos",
    nome: "Fundamentos de LLM para depurar",
    resumo: "Tokens, janela de contexto e amostragem, no nível necessário para achar a causa de um erro.",
    niveis: [
      "Reconhece os termos token, contexto e temperatura",
      "Explica tokens, contexto e amostragem e mede o tamanho de um prompt",
      "Localiza a causa de uma resposta errada por tokenização, contexto ou temperatura",
      "Define limites de contexto e padrões de truncagem usados pelo time",
    ],
    licoes: ["tokenizacao", "bpe", "embeddings", "atencao", "amostragem"],
    leitura: { titulo: "Trilha de fundamentos", caminho: "trilhas/fundamentos/" },
  },
  {
    id: "contexto",
    nome: "Engenharia de contexto",
    resumo: "O contrato entre o prompt e o código: o que entra no contexto e em que formato a resposta volta.",
    niveis: [
      "Reconhece a diferença entre instrução, contexto e entrada do usuário",
      "Escreve prompt com formato de saída definido e interpreta a resposta",
      "Monta contexto que resiste a entrada adversa e mede a diferença entre versões",
      "Mantém os padrões de prompt e de saída estruturada do time",
    ],
    licoes: ["tokenizacao", "amostragem"],
    leitura: { titulo: "Fichamento: context engineering para agentes", caminho: "fichamentos/context-engineering-agents/" },
  },
  {
    id: "agentes-codigo",
    nome: "Desenvolvimento com agentes de código",
    resumo: "Delegar com critério de aceite e revisar o que a IA entrega antes de aceitar.",
    niveis: [
      "Usa um assistente de código para tarefas pontuais",
      "Delega tarefa pequena com critério de aceite e confere o resultado com testes",
      "Encontra defeitos plantados em PR gerado por IA sem falso positivo em excesso",
      "Define o fluxo de revisão e os critérios de aceite para código gerado por IA",
    ],
    licoes: [],
    leitura: { titulo: "Fichamento: RCT da METR com desenvolvedores experientes", caminho: "fichamentos/metr-rct-desenvolvedores-experientes/" },
  },
  {
    id: "rag",
    nome: "RAG",
    resumo: "Recuperar o trecho certo, na versão vigente, e saber dizer que a base não cobre a pergunta.",
    niveis: [
      "Reconhece as etapas de indexação, recuperação e geração",
      "Implementa busca e monta o prompt com os trechos recuperados",
      "Diagnostica se o erro é de recuperação, ranking ou geração e corrige",
      "Define a estratégia de indexação e as métricas de recuperação do produto",
    ],
    licoes: ["embeddings", "rag"],
    leitura: { titulo: "Playbook de RAG", caminho: "playbooks/rag/" },
  },
  {
    id: "evals",
    nome: "Evals e observabilidade",
    resumo: "Medir a qualidade de um sistema com LLM de modo que uma regressão não passe despercebida.",
    niveis: [
      "Reconhece a diferença entre teste de software e avaliação de modelo",
      "Calcula métricas sobre um conjunto de casos pronto",
      "Escreve eval que detecta regressão plantada e não reprova a versão boa",
      "Define o conjunto de referência e o critério de liberação do time",
    ],
    licoes: ["metricas", "avaliacao"],
    leitura: { titulo: "Playbook de evals", caminho: "playbooks/evals/" },
  },
  {
    id: "ferramentas",
    nome: "Agentes e ferramentas",
    resumo: "O loop de um agente que chama ferramentas, incluindo o que fazer quando a ferramenta falha.",
    niveis: [
      "Reconhece o ciclo de decisão, chamada de ferramenta e observação",
      "Implementa o loop de chamada de ferramenta",
      "Trata erro de ferramenta, limite de passos e idempotência",
      "Define os contratos de ferramenta e os limites operacionais dos agentes",
    ],
    licoes: ["agentes"],
    leitura: { titulo: "Fichamento: building effective agents", caminho: "fichamentos/building-effective-agents/" },
  },
  {
    id: "seguranca",
    nome: "Segurança",
    resumo: "Impedir que conteúdo não confiável faça o sistema agir contra o usuário ou a empresa.",
    niveis: [
      "Reconhece o que é prompt injection",
      "Reconhece prompt injection direto e bloqueia o caso óbvio",
      "Bloqueia injeção vinda de documento recuperado sem quebrar o uso legítimo",
      "Define o modelo de ameaças e as políticas de autorização das ferramentas",
    ],
    licoes: [],
    leitura: { titulo: "Playbook de segurança", caminho: "playbooks/seguranca/" },
  },
  {
    id: "custo",
    nome: "Custo e operação",
    resumo: "Saber quanto custa cada requisição e reduzir esse custo sem perder a qualidade medida.",
    niveis: [
      "Reconhece que o custo depende de tokens de entrada e de saída",
      "Estima custo por requisição",
      "Reduz custo com cache e roteamento mantendo a qualidade medida",
      "Define orçamento, alertas e política de modelos do produto",
    ],
    licoes: [],
    leitura: { titulo: "Playbook de custo", caminho: "playbooks/custo/" },
  },
];

export const capacidadePorId = Object.fromEntries(
  capacidades.map((capacidade) => [capacidade.id, capacidade]),
) as Record<CapacidadeId, Capacidade>;

function alvo(valores: number[]): Record<CapacidadeId, number> {
  return Object.fromEntries(
    capacidades.map((capacidade, index) => [capacidade.id, valores[index]]),
  ) as Record<CapacidadeId, number>;
}

/** Perfis-alvo de referência. Em uso real, a empresa ajusta os níveis por papel. */
export const papeis: Papel[] = [
  {
    id: "backend",
    nome: "Backend",
    descricao: "Constrói serviços que chamam LLM: RAG, extração, agentes com ferramentas.",
    alvo: alvo([3, 3, 3, 3, 3, 3, 2, 2]),
  },
  {
    id: "plataforma",
    nome: "Plataforma e SRE",
    descricao: "Opera os sistemas com LLM: confiabilidade, custo, segurança e observabilidade.",
    alvo: alvo([2, 2, 3, 2, 3, 3, 3, 3]),
  },
  {
    id: "qa",
    nome: "QA",
    descricao: "Garante a qualidade de sistemas não determinísticos e do código gerado por IA.",
    alvo: alvo([2, 3, 3, 2, 3, 2, 3, 1]),
  },
  {
    id: "techlead",
    nome: "Tech Lead",
    descricao: "Decide arquitetura e critérios de liberação e revisa o trabalho do time.",
    alvo: alvo([3, 3, 3, 3, 3, 3, 3, 3]),
  },
];

export const papelPorId = Object.fromEntries(
  papeis.map((papel) => [papel.id, papel]),
) as Record<PapelId, Papel>;

export const NOME_CURTO: Record<CapacidadeId, string> = {
  fundamentos: "Fundamentos",
  contexto: "Contexto",
  "agentes-codigo": "Agentes de código",
  rag: "RAG",
  evals: "Evals",
  ferramentas: "Ferramentas",
  seguranca: "Segurança",
  custo: "Custo",
};
