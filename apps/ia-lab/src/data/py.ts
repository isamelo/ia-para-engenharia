/** Python literal: barras invertidas chegam intactas ao interpretador. Não use crases nem "${" dentro. */
export function py(strings: TemplateStringsArray): string {
  return strings.raw[0].replace(/^\n/, "");
}
