import type { Level } from "./types";

export const curriculumSample: Level[] = [
  {
    id: "primeiros-passos",
    number: 1,
    title: "Primeiros passos com Python",
    subtitle: "Seu primeiro experimento começa aqui",
    description:
      "Conheça a linguagem que move a inteligência artificial e escreva seu primeiro programa.",
    lessons: [
      {
        id: "ola-python",
        title: "Olá, Python!",
        summary: "Use print() para dar seus primeiros comandos.",
        minutes: 5,
        theory:
          "## Uma linguagem para criar\n\nPython é uma linguagem de programação fácil de ler e muito usada em ciência de dados e inteligência artificial.\n\nA função `print()` mostra uma mensagem na tela:\n\n```python\nprint(\"Olá, mundo!\")\n```\n\nO texto entre aspas é chamado de *string*.",
        instructions:
          "## Sua vez\n\nMostre a mensagem `Olá, IA!` usando a função `print()`.",
        starterCode: "print(\"Olá, mundo!\")",
        solution: "print(\"Olá, IA!\")",
        hints: [
          "A função `print()` recebe a mensagem entre parênteses.",
          "Use aspas em volta do texto: `print(\"...\")`.",
        ],
        tests: [
          {
            name: "A mensagem correta foi exibida",
            code: "assert 'Olá, IA!' in output, 'A saída precisa conter Olá, IA!'",
          },
        ],
      },
    ],
  },
];
