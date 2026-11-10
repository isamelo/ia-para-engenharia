import { py } from "../py";
import type { Missao } from "../types";

const BASE_OCULTA = py`
_BASE = [
    {"id": "multa-2022", "status": "revogada", "texto": "O cancelamento da assinatura antes de 12 meses gera multa de 20% das mensalidades restantes. O acesso ao painel continua até o fim do ciclo pago."},
    {"id": "multa-2025", "status": "vigente", "texto": "O cancelamento da assinatura antes de 12 meses gera multa de 10% das mensalidades restantes. O acesso ao painel continua até o fim do ciclo pago."},
    {"id": "pix", "status": "vigente", "texto": "As transferências por Pix feitas pelo aplicativo ou pelo painel, para contas de qualquer banco e em qualquer horário, inclusive fins de semana, têm limite de R$ 8.000,00 por dia. O limite pode ser reduzido nas configurações de segurança."},
    {"id": "estorno", "status": "vigente", "texto": "O estorno de uma venda pode ser pedido em até 120 dias. O valor volta ao comprador na fatura seguinte."},
    {"id": "boleto", "status": "vigente", "texto": "O boleto emitido pelo painel é compensado em 1 dia útil. Cada boleto pago tem tarifa de R$ 2,90."},
    {"id": "suporte", "status": "vigente", "texto": "O atendimento humano funciona das 8h às 20h em dias úteis. Fora desse horário, o chamado fica registrado para o dia seguinte."},
    {"id": "link-2023", "status": "revogada", "texto": "O link de pagamento expira em 24 horas depois de criado. Um link expirado não pode ser reativado."},
    {"id": "link-2025", "status": "vigente", "texto": "O link de pagamento expira em 72 horas depois de criado. Um link expirado não pode ser reativado."},
]


def _perguntar(pergunta):
    try:
        _r = responder(pergunta, [dict(doc) for doc in _BASE])
    except Exception as _erro:
        raise AssertionError("responder gerou exceção em uma pergunta da suíte oculta")
    assert isinstance(_r, dict) and isinstance(_r.get("resposta"), str) and isinstance(_r.get("fontes"), list), "responder deve devolver {'resposta': str, 'fontes': list}"
    return _r
`;

export const missaoRag: Missao = {
  id: "rag-politica-antiga",
  capacidade: "rag",
  titulo: "O RAG do suporte cita a política antiga",
  resumo: "Um assistente de suporte responde com regra revogada, corta a informação e inventa quando não sabe. Ache em que etapa do pipeline está cada falha.",
  chamado: "Um lojista perguntou o prazo para pedir estorno e o assistente respondeu 30 dias. A política vigente desde 2025 é de 90 dias. O time já trocou o modelo duas vezes e o erro continua.",
  minutos: 25,
  briefing: `
O assistente de suporte da Orla Pagamentos responde perguntas de lojistas a partir de uma base de conhecimento. O pipeline tem quatro funções, todas no editor: \`dividir\`, \`recuperar\`, \`montar_prompt\` e \`responder\`.

Os relatos dos últimos dias:

- respostas com regras de documentos revogados;
- respostas que param no meio e não trazem o número que o lojista pediu;
- o prazo de estorno continua errado mesmo depois de alguém "limpar a base";
- quando a base não cobre o assunto, o assistente inventa uma resposta confiante.

## Sua tarefa

Corrija o pipeline para que \`responder(pergunta, base)\` devolva \`{"resposta": str, "fontes": [ids]}\` e:

1. use só documentos com \`status\` igual a \`"vigente"\`;
2. entregue ao modelo trechos com frases inteiras;
3. responda com o que está na base, não com o que está em outra parte do prompt;
4. devolva \`SEM_RESPOSTA\` e \`fontes\` vazia quando a base não sustenta uma resposta;
5. liste em \`fontes\` no máximo 3 documentos, todos vigentes, incluindo o que sustenta a resposta.

## O que você tem

- \`BASE\`: a base de conhecimento de exemplo. Cada documento tem \`id\`, \`status\` e \`texto\`.
- \`termos(texto)\`: conjunto de palavras normalizadas de um texto.
- \`modelo.gerar(prompt)\`: o LLM simulado. Leia a docstring em **Arquivos do cenário**: ela descreve como ele escolhe a resposta, o que faz quando o contexto não ajuda e qual é o limite da janela.

## Como a correção funciona

A suíte de correção usa **outra base e outras perguntas**. Ajustar o código às perguntas de exemplo não resolve. Antes de enviar, use **Executar** para imprimir os trechos recuperados e o prompt montado: é assim que se descobre em que etapa a resposta se perde.
`,
  cenario: py`
import re
import unicodedata

SEM_RESPOSTA = "Não encontrei essa informação na base de conhecimento."

PALAVRAS_VAZIAS = {
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "um", "uma", "que",
    "qual", "quais", "como", "no", "na", "nos", "nas", "ao", "se", "eu", "meu", "minha", "ser", "pode", "posso",
    "ate", "quanto", "quando", "tem", "ha", "voces",
}


def termos(texto):
    """Palavras do texto sem acento, em minúsculas, no singular e sem palavras vazias."""
    sem_acento = unicodedata.normalize("NFD", texto.lower())
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    palavras = re.findall(r"[a-z0-9]+", sem_acento)
    palavras = [p[:-1] if len(p) > 3 and p.endswith("s") else p for p in palavras]
    return {p for p in palavras if p not in PALAVRAS_VAZIAS}


class ModeloSimulado:
    """LLM simulado e determinístico. Não chama nenhuma API.

    Comportamento, parecido com o de um modelo real nos pontos que importam aqui:
    - Lê o prompt inteiro. Acima de JANELA palavras, devolve uma mensagem de erro.
    - Responde à última linha que começa com "Pergunta:".
    - Responde copiando a frase do prompt, anterior à pergunta, que tem mais termos em comum com ela.
      Em caso de empate, fica com a que aparece primeiro. Qualquer parte do prompt vale: contexto,
      instruções e exemplos.
    - Se nenhuma frase tem ao menos 2 termos em comum com a pergunta, não avisa: inventa uma resposta confiante.
    """

    JANELA = 160

    def gerar(self, prompt):
        if len(prompt.split()) > self.JANELA:
            return "ERRO: o prompt passou da janela de contexto do modelo (%d palavras)." % self.JANELA
        linhas = [linha.strip() for linha in prompt.split("\n") if linha.strip()]
        perguntas = [i for i, linha in enumerate(linhas) if linha.startswith("Pergunta:")]
        if not perguntas:
            return "Pode reformular a pergunta?"
        consulta = termos(linhas[perguntas[-1]][len("Pergunta:"):])
        melhor, melhor_nota = None, 0
        for linha in linhas[:perguntas[-1]]:
            if linha.startswith("Pergunta:"):
                continue
            if linha.startswith("Resposta:"):
                linha = linha[len("Resposta:"):].strip()
            for frase in re.split(r"(?<=[.!?])\s+", linha):
                nota = len(consulta & termos(frase))
                if nota > melhor_nota:
                    melhor, melhor_nota = frase.strip(), nota
        if melhor_nota < 2:
            return "Sim, é possível. O prazo é de 5 dias úteis e não há cobrança."
        return melhor


modelo = ModeloSimulado()

BASE = [
    {"id": "estorno-2023", "status": "revogada", "texto": "O estorno de uma venda pode ser pedido em até 30 dias após a transação. Depois desse prazo, o pedido deve ser feito à operadora do cartão."},
    {"id": "estorno-2025", "status": "vigente", "texto": "O estorno de uma venda pode ser pedido em até 90 dias após a transação. O estorno parcial é permitido quando a venda não foi parcelada."},
    {"id": "repasse", "status": "vigente", "texto": "O repasse das vendas no débito cai na conta em 1 dia útil. O repasse das vendas no crédito à vista, feitas na maquininha ou por link de pagamento, cai na conta do lojista em 2 dias úteis. Vendas parceladas são repassadas a cada 30 dias."},
    {"id": "antecipacao-2024", "status": "revogada", "texto": "A tarifa de antecipação de recebíveis é de 3,2% ao mês. A antecipação pode ser pedida pelo aplicativo."},
    {"id": "antecipacao-2025", "status": "vigente", "texto": "A tarifa de antecipação de recebíveis é de 2,4% ao mês. A antecipação automática pode ser ligada pelo aplicativo."},
    {"id": "maquininha", "status": "vigente", "texto": "A troca da maquininha com defeito é gratuita nos primeiros 12 meses. Depois desse período, a troca custa R$ 60,00. O envio da nova maquininha leva até 5 dias úteis."},
    {"id": "contestacao", "status": "vigente", "texto": "Quando o comprador contesta uma venda, o lojista tem 7 dias corridos para enviar o comprovante. Sem comprovante, o valor da venda é devolvido ao comprador."},
]
`,
  starterCode: py`
def dividir(doc, tamanho=120):
    """Quebra o documento em trechos para indexação."""
    texto = doc["texto"]
    return [{"doc_id": doc["id"], "texto": texto[i:i + tamanho]} for i in range(0, len(texto), tamanho)]


def recuperar(pergunta, base, k=3):
    """Devolve os k trechos com mais termos em comum com a pergunta."""
    consulta = termos(pergunta)
    trechos = [trecho for doc in base for trecho in dividir(doc)]
    trechos.sort(key=lambda trecho: len(consulta & termos(trecho["texto"])), reverse=True)
    return trechos[:k]


def montar_prompt(pergunta, trechos):
    contexto = "\n".join(trecho["texto"] for trecho in trechos)
    return (
        "Você é o assistente de suporte da Orla Pagamentos. Responda com base no contexto.\n\n"
        "Exemplo:\n"
        "Pergunta: Qual o prazo de estorno de uma venda?\n"
        "Resposta: O estorno de uma venda pode ser pedido em até 30 dias.\n\n"
        "Contexto:\n" + contexto + "\n\n"
        "Pergunta: " + pergunta
    )


def responder(pergunta, base):
    trechos = recuperar(pergunta, base)
    resposta = modelo.gerar(montar_prompt(pergunta, trechos))
    return {"resposta": resposta, "fontes": [trecho["doc_id"] for trecho in trechos]}


perguntas = [
    "Qual o prazo para pedir o estorno de uma venda?",
    "Qual a tarifa de antecipação de recebíveis?",
    "Em quantos dias cai o repasse das vendas no crédito à vista?",
    "Vocês emprestam dinheiro para capital de giro?",
]
for pergunta in perguntas:
    saida = responder(pergunta, BASE)
    print(pergunta)
    print("  resposta:", saida["resposta"])
    print("  fontes:  ", saida["fontes"])
`,
  solution: py`
def dividir(doc):
    frases = re.split(r"(?<=[.!?])\s+", doc["texto"])
    return [{"doc_id": doc["id"], "texto": frase} for frase in frases if frase.strip()]


def recuperar(pergunta, base, k=3):
    consulta = termos(pergunta)
    candidatos = []
    for doc in base:
        if doc["status"] != "vigente":
            continue
        for trecho in dividir(doc):
            nota = len(consulta & termos(trecho["texto"]))
            if nota >= 2:
                candidatos.append((nota, trecho))
    candidatos.sort(key=lambda item: item[0], reverse=True)
    return [trecho for _, trecho in candidatos[:k]]


def montar_prompt(pergunta, trechos):
    contexto = "\n".join(trecho["texto"] for trecho in trechos)
    return (
        "Você é o assistente de suporte da Orla Pagamentos. Responda apenas com base no contexto.\n\n"
        "Contexto:\n" + contexto + "\n\n"
        "Pergunta: " + pergunta
    )


def responder(pergunta, base):
    trechos = recuperar(pergunta, base)
    if not trechos:
        return {"resposta": SEM_RESPOSTA, "fontes": []}
    resposta = modelo.gerar(montar_prompt(pergunta, trechos))
    fontes = []
    for trecho in trechos:
        if trecho["doc_id"] not in fontes:
            fontes.append(trecho["doc_id"])
    return {"resposta": resposta, "fontes": fontes}
`,
  solucaoParcial: py`
def dividir(doc):
    frases = re.split(r"(?<=[.!?])\s+", doc["texto"])
    return [{"doc_id": doc["id"], "texto": frase} for frase in frases if frase.strip()]


def recuperar(pergunta, base, k=3):
    consulta = termos(pergunta)
    trechos = [trecho for doc in base if doc["status"] == "vigente" for trecho in dividir(doc)]
    trechos.sort(key=lambda trecho: len(consulta & termos(trecho["texto"])), reverse=True)
    return trechos[:k]


def montar_prompt(pergunta, trechos):
    contexto = "\n".join(trecho["texto"] for trecho in trechos)
    return (
        "Você é o assistente de suporte da Orla Pagamentos. Responda com base no contexto.\n\n"
        "Exemplo:\n"
        "Pergunta: Qual o prazo de estorno de uma venda?\n"
        "Resposta: O estorno de uma venda pode ser pedido em até 30 dias.\n\n"
        "Contexto:\n" + contexto + "\n\n"
        "Pergunta: " + pergunta
    )


def responder(pergunta, base):
    trechos = recuperar(pergunta, base)
    resposta = modelo.gerar(montar_prompt(pergunta, trechos))
    return {"resposta": resposta, "fontes": [trecho["doc_id"] for trecho in trechos]}
`,
  criterios: [
    {
      name: "Responde com a regra vigente quando existe versão revogada do documento",
      nivel: 2,
      code: BASE_OCULTA + py`
_r = _perguntar("Qual a multa por cancelamento da assinatura?")
assert "20%" not in _r["resposta"], "A resposta trouxe a regra de um documento revogado"
assert "10%" in _r["resposta"], "A resposta não trouxe a regra vigente"
_r = _perguntar("Em quantas horas expira o link de pagamento?")
assert "24 horas" not in _r["resposta"], "A resposta trouxe a regra de um documento revogado"
assert "72 horas" in _r["resposta"], "A resposta não trouxe a regra vigente"
`,
    },
    {
      name: "A resposta traz a informação completa, sem frase cortada",
      nivel: 2,
      code: BASE_OCULTA + py`
_r = _perguntar("Qual o limite das transferências por Pix feitas pelo aplicativo?")
assert "8.000,00" in _r["resposta"], "A resposta não trouxe a informação pedida: a frase chegou cortada ao modelo"
assert _r["resposta"].rstrip().endswith("."), "A resposta termina no meio de uma frase"
`,
    },
    {
      name: "A resposta vem da base, não de outra parte do prompt",
      nivel: 3,
      code: BASE_OCULTA + py`
_r = _perguntar("Qual o prazo de estorno de uma venda?")
assert "30 dias" not in _r["resposta"], "A resposta trouxe um prazo que não está em nenhum documento vigente da base"
assert "120 dias" in _r["resposta"], "A resposta não trouxe o prazo que está na base"
`,
    },
    {
      name: "Declara que não sabe quando a base não cobre a pergunta",
      nivel: 3,
      code: BASE_OCULTA + py`
for _pergunta in ("Vocês oferecem seguro para a loja?", "A Orla tem cartão de crédito próprio?"):
    _r = _perguntar(_pergunta)
    assert _r["resposta"] == SEM_RESPOSTA, "Uma pergunta fora da base recebeu resposta inventada"
    assert _r["fontes"] == [], "Uma resposta sem sustentação veio com fontes"
_r = _perguntar("Qual a tarifa de cada boleto pago?")
assert "2,90" in _r["resposta"], "Uma pergunta coberta pela base ficou sem resposta"
`,
    },
    {
      name: "Cita no máximo 3 fontes, todas vigentes, incluindo a que sustenta a resposta",
      nivel: 3,
      code: BASE_OCULTA + py`
_casos = [
    ("Qual a multa por cancelamento da assinatura?", "multa-2025"),
    ("Em quantas horas expira o link de pagamento?", "link-2025"),
    ("Qual o horário do atendimento humano?", "suporte"),
]
_revogadas = {doc["id"] for doc in _BASE if doc["status"] != "vigente"}
for _pergunta, _fonte in _casos:
    _r = _perguntar(_pergunta)
    assert _fonte in _r["fontes"], "O documento que sustenta a resposta não está nas fontes"
    assert not (_revogadas & set(_r["fontes"])), "Há documento revogado entre as fontes"
    assert len(_r["fontes"]) <= 3 and len(set(_r["fontes"])) == len(_r["fontes"]), "As fontes devem ser até 3 documentos, sem repetição"
`,
    },
  ],
};
