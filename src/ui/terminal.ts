export function padRightCells(value: string, width: number): string {
  const text = truncateCells(value, width);
  return `${text}${" ".repeat(Math.max(0, width - terminalWidth(text)))}`;
}

export function padLeftCells(value: string, width: number): string {
  const text = truncateCells(value, width);
  return `${" ".repeat(Math.max(0, width - terminalWidth(text)))}${text}`;
}

export function truncateCells(value: string, width: number): string {
  if (width <= 0) {
    return "";
  }
  let result = "";
  let used = 0;
  for (const { segment: char, width: charWidth } of textCells(value)) {
    if (used + charWidth > width) {
      break;
    }
    result += char;
    used += charWidth;
  }
  return result;
}

export function terminalWidth(value: string): number {
  let width = 0;
  for (const cell of textCells(value)) {
    width += cell.width;
  }
  return width;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Measure complete graphemes so emoji sequences and combining marks stay intact. */
export function textCells(value: string): Array<{ segment: string; width: number }> {
  return Array.from(segmenter.segment(value), ({ segment }) => ({
    segment,
    width: /[\ufe0f\u20e3]/u.test(segment) ? 2 : Math.max(0, ...Array.from(segment, charCellWidth)),
  }));
}

function charCellWidth(char: string): number {
  const code = char.codePointAt(0) || 0;
  if (
    code === 0 ||
    code < 32 ||
    (code >= 0x7f && code < 0xa0) ||
    /[\p{Mark}\u200d\ufe0e\ufe0f]/u.test(char)
  ) {
    return 0;
  }
  if (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6))
  ) {
    return 2;
  }
  if (
    (code >= 0x1f000 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf)
  ) {
    return 2;
  }
  return 1;
}
