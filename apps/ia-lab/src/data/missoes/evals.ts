import { py } from "../py";
import type { Missao } from "../types";

const APOIO = py`
import re as _re

_GABARITO = {caso["ticket"]: caso["esperado"] for caso in CASOS}
_ORDEM = [caso["ticket"] for caso in CASOS]


def _resumo(ticket):
    texto = _re.sub(r"\d{3}\.\d{3}\.\d{3}-\d{2}", "[CPF]", ticket)
    texto = _re.sub(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", "[e-mail]", texto)
    return texto[:150]


def _versao(alterar=None):
    def sistema(ticket):
        esperado = _GABARITO[ticket]
        saida = {"categoria": esperado["categoria"], "prioridade": "media", "valor": esperado["valor"], "resumo": _resumo(ticket)}
        if alterar:
            saida = alterar(_ORDEM.index(ticket), ticket, saida)
        return saida
    return sistema


def _trocar(saida, **campos):
    nova = dict(saida)
    nova.update(campos)
    return nova


def _outra_categoria(saida):
    return _trocar(saida, categoria="outro" if saida["categoria"] != "outro" else "acesso")


def _julgar(sistema):
    try:
        _r = avaliar(sistema)
    except Exception as _erro:
        raise AssertionError("avaliar gerou exceção em vez de devolver um veredito")
    assert isinstance(_r, dict) and isinstance(_r.get("aprovado"), bool) and isinstance(_r.get("motivos"), list), "avaliar deve devolver {'aprovado': bool, 'motivos': list}"
    return _r


def _reprova(sistema, mensagem):
    _r = _julgar(sistema)
    assert _r["aprovado"] is False, mensagem
    assert _r["motivos"] and all(isinstance(m, str) and m.strip() for m in _r["motivos"]), "Uma versão foi reprovada sem motivo registrado"


def _aprova(sistema, mensagem):
    assert _julgar(sistema)["aprovado"] is True, mensagem
`;

export const missaoEvals: Missao = {
  id: "eval-regressao",
  capacidade: "evals",
  titulo: "Escreva o eval que pega a regressão",
  resumo: "Uma mudança de prompt passou pelo eval e quebrou em produção. Escreva a avaliação que reprova as versões com defeito e não reprova a versão boa.",
  chamado: "A versão 2 do prompt do extrator de chamados foi aprovada pelo eval na sexta. Na segunda, o financeiro encontrou reembolsos de R$ 1.250,00 registrados como R$ 1,25.",
  minutos: 25,
  briefing: `
O extrator de chamados recebe o texto de um chamado e devolve \`{"categoria", "prioridade", "valor", "resumo"}\`. Antes de liberar uma mudança de prompt, o time roda \`avaliar(sistema)\` sobre os casos de referência em \`CASOS\`. O eval atual só confere a categoria, com um limiar frouxo, e aprovou a versão que quebrou.

## Sua tarefa

Reescreva \`avaliar(sistema)\` para devolver \`{"aprovado": bool, "motivos": [str]}\` segundo o critério de liberação do time. Uma versão só é aprovada quando:

1. **Contrato.** Toda saída é um dicionário com as quatro chaves, \`categoria\` em \`CATEGORIAS\` e \`prioridade\` em \`PRIORIDADES\`.
2. **Categoria.** A categoria está certa em pelo menos 90% dos casos.
3. **Valor.** Em todos os casos, \`valor\` é numérico e difere do esperado em no máximo 0,01. Quando o chamado não cita valor, o esperado é \`None\`.
4. **Resumo.** É texto não vazio, com até 200 caracteres, sem CPF nem e-mail. O texto do resumo é livre: não existe redação esperada.
5. **Robustez.** Uma versão que lança exceção em algum caso é reprovada. \`avaliar\` nunca deixa a exceção escapar.

Quando reprovar, \`motivos\` diz o que falhou.

## O que você tem

- \`CASOS\`: 20 chamados com a categoria e o valor esperados.
- \`sistema_v1\` e \`sistema_v2\`: as duas versões do extrator, com respostas gravadas. A v1 é a que está em produção e cumpre o critério. A v2 é a que quebrou.
- \`PADRAO_CPF\` e \`PADRAO_EMAIL\`: expressões regulares prontas.

## Como a correção funciona

Seu eval é executado contra **versões do extrator que você não vê**: algumas boas, outras com um defeito plantado cada. Ele precisa reprovar todas as defeituosas e aprovar todas as boas. Um eval que reprova versão boa trava o time tanto quanto um que aprova versão ruim.
`,
  cenario: py`
import re

CATEGORIAS = ("cobranca", "reembolso", "acesso", "outro")
PRIORIDADES = ("baixa", "media", "alta")
PADRAO_CPF = r"\d{3}\.\d{3}\.\d{3}-\d{2}"
PADRAO_EMAIL = r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"


def _caso(ticket, categoria, valor=None):
    return {"ticket": ticket, "esperado": {"categoria": categoria, "valor": valor}}


CASOS = [
    _caso("Fui cobrado duas vezes na mensalidade de março, R$ 89,90 cada.", "cobranca", 89.90),
    _caso("Quero o reembolso de R$ 1.250,00 do pedido 4471, o produto não chegou.", "reembolso", 1250.00),
    _caso("Não consigo entrar no aplicativo, diz senha inválida.", "acesso"),
    _caso("Meu CPF é 123.456.789-09 e preciso do reembolso de R$ 320,00.", "reembolso", 320.00),
    _caso("A taxa de R$ 12,50 por boleto está diferente do meu contrato.", "cobranca", 12.50),
    _caso("Vocês têm maquininha com impressora?", "outro"),
    _caso("Bloquearam meu acesso depois de três tentativas. Meu e-mail é joana@lojadajoana.com.br.", "acesso"),
    _caso("Cobrança indevida de R$ 2.480,00 na fatura de abril.", "cobranca", 2480.00),
    _caso("Devolvam os R$ 59,00 da venda cancelada ontem.", "reembolso", 59.00),
    _caso("Como altero o endereço da loja no cadastro?", "outro"),
    _caso("O código de verificação não chega por SMS.", "acesso"),
    _caso("Paguei R$ 199,00 de anuidade e o plano era gratuito.", "cobranca", 199.00),
    _caso("Reembolso de R$ 3.075,40 negado sem explicação, CPF 987.654.321-00.", "reembolso", 3075.40),
    _caso("Qual o horário do suporte no sábado?", "outro"),
    _caso("Esqueci a senha e o e-mail de recuperação vai para caio@antigo.example.", "acesso"),
    _caso("A tarifa de antecipação veio R$ 45,10 maior que o combinado.", "cobranca", 45.10),
    _caso("O cliente desistiu da compra, preciso estornar R$ 780,00.", "reembolso", 780.00),
    _caso("Quero encerrar a conta da minha empresa.", "outro"),
    _caso("Não recebo o link para redefinir a senha.", "acesso"),
    _caso("Fatura de maio com R$ 1.019,99 a mais do que o plano contratado.", "cobranca", 1019.99),
]


def _gravar(versao):
    """Respostas gravadas de uma versão do prompt para cada chamado de CASOS."""
    gravacao = {}
    for caso in CASOS:
        ticket, esperado = caso["ticket"], caso["esperado"]
        valor = esperado["valor"]
        if versao == 2 and valor is not None and valor >= 1000:
            valor = round(valor / 1000, 2)
        resumo = re.sub(PADRAO_CPF, "[CPF]", ticket)
        resumo = re.sub(PADRAO_EMAIL, "[e-mail]", resumo)
        gravacao[ticket] = {
            "categoria": esperado["categoria"],
            "prioridade": "alta" if esperado["categoria"] == "acesso" else "media",
            "valor": valor,
            "resumo": "Chamado de %s. %s" % (esperado["categoria"], resumo),
        }
    return gravacao


_V1, _V2 = _gravar(1), _gravar(2)


def sistema_v1(ticket):
    """Versão em produção."""
    return dict(_V1[ticket])


def sistema_v2(ticket):
    """Versão com o prompt novo, aprovada pelo eval antigo."""
    return dict(_V2[ticket])
`,
  starterCode: py`
def avaliar(sistema):
    """Decide se uma versão do extrator pode ser liberada."""
    acertos = 0
    for caso in CASOS:
        saida = sistema(caso["ticket"])
        if saida["categoria"] == caso["esperado"]["categoria"]:
            acertos += 1
    aprovado = acertos / len(CASOS) >= 0.5
    return {"aprovado": aprovado, "motivos": []}


print("v1:", avaliar(sistema_v1))
print("v2:", avaliar(sistema_v2))
`,
  solution: py`
CHAVES = ("categoria", "prioridade", "valor", "resumo")


def avaliar(sistema):
    motivos = []
    acertos = 0
    for numero, caso in enumerate(CASOS, start=1):
        esperado = caso["esperado"]
        try:
            saida = sistema(caso["ticket"])
        except Exception as erro:
            motivos.append("caso %d: o sistema lançou %s" % (numero, type(erro).__name__))
            continue
        if not isinstance(saida, dict) or any(chave not in saida for chave in CHAVES):
            motivos.append("caso %d: saída fora do contrato" % numero)
            continue
        if saida["categoria"] not in CATEGORIAS:
            motivos.append("caso %d: categoria fora da lista" % numero)
        if saida["prioridade"] not in PRIORIDADES:
            motivos.append("caso %d: prioridade fora da lista" % numero)
        if saida["categoria"] == esperado["categoria"]:
            acertos += 1
        valor = saida["valor"]
        if esperado["valor"] is None:
            if valor is not None:
                motivos.append("caso %d: valor informado sem o chamado citar valor" % numero)
        elif isinstance(valor, bool) or not isinstance(valor, (int, float)):
            motivos.append("caso %d: valor não numérico" % numero)
        elif abs(valor - esperado["valor"]) > 0.01:
            motivos.append("caso %d: valor %s, esperado %s" % (numero, valor, esperado["valor"]))
        resumo = saida["resumo"]
        if not isinstance(resumo, str) or not resumo.strip():
            motivos.append("caso %d: resumo vazio" % numero)
        elif len(resumo) > 200:
            motivos.append("caso %d: resumo com mais de 200 caracteres" % numero)
        elif re.search(PADRAO_CPF, resumo) or re.search(PADRAO_EMAIL, resumo):
            motivos.append("caso %d: resumo com dado pessoal" % numero)
    taxa = acertos / len(CASOS)
    if taxa < 0.9:
        motivos.append("categoria certa em %.0f%% dos casos, mínimo 90%%" % (taxa * 100))
    return {"aprovado": not motivos, "motivos": motivos}
`,
  solucaoParcial: py`
def avaliar(sistema):
    motivos = []
    acertos = 0
    for caso in CASOS:
        esperado = caso["esperado"]
        saida = sistema(caso["ticket"])
        if saida["categoria"] == esperado["categoria"]:
            acertos += 1
        if esperado["valor"] is not None and abs((saida["valor"] or 0) - esperado["valor"]) > 0.01:
            motivos.append("valor errado: %s" % saida["valor"])
    if acertos / len(CASOS) < 0.9:
        motivos.append("categoria abaixo de 90%")
    return {"aprovado": not motivos, "motivos": motivos}
`,
  criterios: [
    {
      name: "Aprova uma versão que cumpre o critério de liberação",
      nivel: 2,
      code: APOIO + py`
_aprova(_versao(), "Uma versão que cumpre todo o critério foi reprovada")
`,
    },
    {
      name: "Reprova queda no acerto de categoria",
      nivel: 2,
      code: APOIO + py`
_reprova(_versao(lambda i, t, s: _outra_categoria(s) if i in (1, 8, 16) else s), "Uma versão com 85% de acerto de categoria foi aprovada")
`,
    },
    {
      name: "Reprova valor extraído errado",
      nivel: 2,
      code: APOIO + py`
_reprova(_versao(lambda i, t, s: _trocar(s, valor=s["valor"] * 100) if i == 4 else s), "Uma versão com valor errado em um caso foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, valor=round(s["valor"] - 0.5, 2)) if i == 12 else s), "Uma versão com valor 50 centavos menor em um caso foi aprovada")
`,
    },
    {
      name: "Não reprova versão boa por redação diferente, tipo numérico ou acerto no limite",
      nivel: 3,
      code: APOIO + py`
def _boa(i, ticket, saida):
    saida = _trocar(saida, resumo="Cliente pede ajuda com " + saida["categoria"] + ".", prioridade="baixa")
    if isinstance(saida["valor"], float) and saida["valor"] == int(saida["valor"]):
        saida["valor"] = int(saida["valor"])
    return _outra_categoria(saida) if i in (5, 13) else saida

_aprova(_versao(_boa), "Uma versão boa foi reprovada: resumo com outra redação, valor inteiro ou exatamente 90% de acerto")
`,
    },
    {
      name: "Reprova saída fora do contrato",
      nivel: 3,
      code: APOIO + py`
_reprova(_versao(lambda i, t, s: _trocar(s, prioridade="urgente") if i == 7 else s), "Uma versão com prioridade fora da lista foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, categoria="financeiro") if i == 0 else s), "Uma versão com categoria fora da lista foi aprovada")
_reprova(_versao(lambda i, t, s: {k: v for k, v in s.items() if k != "resumo"} if i == 10 else s), "Uma versão com chave ausente foi aprovada")
_reprova(_versao(lambda i, t, s: "não consegui classificar" if i == 2 else s), "Uma versão que devolveu texto em vez de dicionário foi aprovada")
`,
    },
    {
      name: "Reprova valor inventado ou não numérico",
      nivel: 3,
      code: APOIO + py`
_reprova(_versao(lambda i, t, s: _trocar(s, valor=0.0) if i == 9 else s), "Uma versão que informou valor em chamado sem valor foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, valor="320,00") if i == 3 else s), "Uma versão com valor em texto foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, valor=None) if i == 11 else s), "Uma versão que deixou de extrair um valor foi aprovada")
`,
    },
    {
      name: "Reprova resumo com dado pessoal, vazio ou acima do tamanho",
      nivel: 3,
      code: APOIO + py`
_reprova(_versao(lambda i, t, s: _trocar(s, resumo=t) if i == 3 else s), "Uma versão com CPF no resumo foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, resumo=t) if i == 14 else s), "Uma versão com e-mail no resumo foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, resumo="") if i == 6 else s), "Uma versão com resumo vazio foi aprovada")
_reprova(_versao(lambda i, t, s: _trocar(s, resumo="Resumo longo. " * 20) if i == 18 else s), "Uma versão com resumo acima de 200 caracteres foi aprovada")
`,
    },
    {
      name: "Reprova, sem quebrar, a versão que lança exceção",
      nivel: 3,
      code: APOIO + py`
def _instavel(i, ticket, saida):
    if i == 15:
        raise TimeoutError("tempo esgotado")
    return saida

_reprova(_versao(_instavel), "Uma versão que lança exceção em um caso foi aprovada")
`,
    },
  ],
};
