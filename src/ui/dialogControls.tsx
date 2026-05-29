import React from "react";
import { Box, Text } from "ink";
import { padRightCells, terminalWidth, truncateCells } from "./terminal.js";

export type DialogColor = "black" | "cyan" | "green" | "gray" | "yellow" | "red" | "white";

export function DialogTextLine({
  color,
  left,
  right,
  text,
}: {
  color: "cyan" | "yellow";
  left: string;
  right: string;
  text: string;
}) {
  return (
    <Box>
      <Text>{left}</Text>
      <Text color={color}>{text}</Text>
      <Text>{right}</Text>
    </Box>
  );
}

export function DialogInputLine({
  borderColor,
  left,
  right,
  value,
  cursor,
  width,
}: {
  borderColor: "cyan" | "yellow";
  left: string;
  right: string;
  value: string;
  cursor: number;
  width: number;
}) {
  const prompt = "> ";
  const valueWidth = Math.max(1, width - terminalWidth(prompt));
  const view = editWindow(value, cursor, valueWidth);
  const visibleValue = `${view.left}${view.cursor}${view.right}`;
  const safeVisibleValue = truncateCells(visibleValue, valueWidth);
  const safeCursorIndex = Math.max(
    0,
    Math.min(Array.from(view.left).length, Array.from(safeVisibleValue).length),
  );
  const safeChars = Array.from(safeVisibleValue);
  const safeLeft = safeChars.slice(0, safeCursorIndex).join("");
  const remainingAfterLeft = valueWidth - terminalWidth(safeLeft);
  const rawSafeCursor = safeChars[safeCursorIndex] ?? " ";
  const safeCursor =
    remainingAfterLeft > 0 && terminalWidth(rawSafeCursor) <= remainingAfterLeft
      ? rawSafeCursor
      : "";
  const safeRight = safeCursor
    ? safeChars.slice(safeCursorIndex + 1).join("")
    : "";
  const safeFillWidth = Math.max(
    0,
    valueWidth -
      terminalWidth(safeLeft) -
      terminalWidth(safeCursor) -
      terminalWidth(safeRight),
  );

  return (
    <Box>
      <Text>{left}</Text>
      <Text color={borderColor}>| </Text>
      <Text color="green">{prompt}</Text>
      <Text>{safeLeft}</Text>
      <Text inverse>{safeCursor}</Text>
      <Text>{safeRight}</Text>
      <Text>{" ".repeat(safeFillWidth)}</Text>
      <Text color={borderColor}> |</Text>
      <Text>{right}</Text>
    </Box>
  );
}

export function DialogTextarea({
  borderColor,
  left,
  right,
  value,
  cursor,
  width,
  lineCount,
}: {
  borderColor: "cyan" | "yellow";
  left: string;
  right: string;
  value: string;
  cursor: number;
  width: number;
  lineCount: number;
}) {
  const prompt = "> ";
  const continuationPrompt = "  ";
  const valueWidth = Math.max(1, width - terminalWidth(prompt));
  const allLines = editableTextAreaLines(value, cursor, valueWidth);
  const cursorLine = allLines.findIndex((line) => line.hasCursor);
  const visibleCount = Math.max(1, lineCount);
  const windowStart = Math.min(
    Math.max(0, allLines.length - visibleCount),
    Math.max(0, (cursorLine < 0 ? 0 : cursorLine) - Math.floor(visibleCount / 2)),
  );
  const visibleLines = allLines.slice(windowStart, windowStart + visibleCount);
  while (visibleLines.length < visibleCount) {
    visibleLines.push({ left: "", cursor: "", right: "", hasCursor: false });
  }

  return (
    <>
      {visibleLines.map((line, index) => {
        const originalLineIndex = windowStart + index;
        const linePrompt = originalLineIndex === 0 ? prompt : continuationPrompt;
        const fillWidth = Math.max(
          0,
          valueWidth -
            terminalWidth(line.left) -
            terminalWidth(line.cursor) -
            terminalWidth(line.right),
        );
        return (
          <Box key={`${originalLineIndex}-${index}`}>
            <Text>{left}</Text>
            <Text color={borderColor}>| </Text>
            <Text color="green">{linePrompt}</Text>
            <Text>{line.left}</Text>
            {line.hasCursor ? <Text inverse>{line.cursor || " "}</Text> : null}
            <Text>{line.right}</Text>
            <Text>{" ".repeat(fillWidth)}</Text>
            <Text color={borderColor}> |</Text>
            <Text>{right}</Text>
          </Box>
        );
      })}
    </>
  );
}

export function DialogContentLine({
  borderColor,
  color,
  backgroundColor,
  left,
  right,
  content,
  width,
  bold = false,
}: {
  borderColor: "cyan" | "yellow";
  color: DialogColor;
  backgroundColor?: DialogColor;
  left: string;
  right: string;
  content: string;
  width: number;
  bold?: boolean;
}) {
  return (
    <Box>
      <Text>{left}</Text>
      <Text color={borderColor}>| </Text>
      <Text color={color} backgroundColor={backgroundColor} bold={bold}>
        {padRightCells(truncateCells(content, width), width)}
      </Text>
      <Text color={borderColor}> |</Text>
      <Text>{right}</Text>
    </Box>
  );
}

interface EditableTextAreaLine {
  left: string;
  cursor: string;
  right: string;
  hasCursor: boolean;
}

interface EditableTextAreaCell {
  text: string;
  inverse: boolean;
}

export function editableTextAreaLineCount(value: string, cursor: number, width: number): number {
  return editableTextAreaLines(value, cursor, width).length;
}

export function editableTextAreaLines(
  value: string,
  cursor: number,
  width: number,
): EditableTextAreaLine[] {
  const chars = Array.from(value);
  const safeCursor = clampCursor(cursor, chars.length);
  const lines: EditableTextAreaCell[][] = [[]];
  let lineWidth = 0;
  let index = 0;

  const pushLine = () => {
    lines.push([]);
    lineWidth = 0;
  };
  const pushCell = (rawText: string, inverse: boolean) => {
    const text = terminalWidth(rawText) <= width ? rawText : " ";
    const cellWidth = Math.max(1, terminalWidth(text));
    if (lineWidth > 0 && lineWidth + cellWidth > width) {
      pushLine();
    }
    lines[lines.length - 1]?.push({ text, inverse });
    lineWidth += cellWidth;
  };

  while (index <= chars.length) {
    if (index === safeCursor) {
      const rawCursor = chars[index];
      const cursorText = rawCursor && rawCursor !== "\n" && rawCursor !== "\r"
        ? rawCursor
        : " ";
      pushCell(cursorText, true);
      if (rawCursor && rawCursor !== "\n" && rawCursor !== "\r") {
        index += 1;
        continue;
      }
    }

    if (index >= chars.length) {
      break;
    }

    const char = chars[index] || "";
    index += 1;
    if (char === "\n" || char === "\r") {
      pushLine();
      continue;
    }
    pushCell(char, false);
  }

  return lines.map((cells) => {
    const cursorIndex = cells.findIndex((cell) => cell.inverse);
    if (cursorIndex < 0) {
      return {
        left: cells.map((cell) => cell.text).join(""),
        cursor: "",
        right: "",
        hasCursor: false,
      };
    }
    return {
      left: cells.slice(0, cursorIndex).map((cell) => cell.text).join(""),
      cursor: cells[cursorIndex]?.text || " ",
      right: cells.slice(cursorIndex + 1).map((cell) => cell.text).join(""),
      hasCursor: true,
    };
  });
}

export function wrapDialogText(value: string, width: number, maxLines: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (terminalWidth(candidate) > width && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) {
        break;
      }
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  if (!lines.length) {
    return [""];
  }
  return lines.map((lineText) => truncateCells(lineText, width));
}

export function insertAtCursor(value: string, cursor: number, text: string): string {
  const chars = Array.from(value);
  const safeCursor = clampCursor(cursor, chars.length);
  chars.splice(safeCursor, 0, ...Array.from(text));
  return chars.join("");
}

export function removeAtCursor(
  value: string,
  cursor: number,
  direction: "backward" | "forward",
): string {
  const chars = Array.from(value);
  const safeCursor = clampCursor(cursor, chars.length);
  if (direction === "backward") {
    if (safeCursor > 0) {
      chars.splice(safeCursor - 1, 1);
    }
  } else if (safeCursor < chars.length) {
    chars.splice(safeCursor, 1);
  }
  return chars.join("");
}

export function editWindow(
  value: string,
  cursor: number,
  width: number,
): { left: string; cursor: string; right: string } {
  if (width <= 0) {
    return { left: "", cursor: "", right: "" };
  }

  const chars = Array.from(value);
  const safeCursor = clampCursor(cursor, chars.length);
  const rawCursor = chars[safeCursor] ?? " ";
  const cursorText = terminalWidth(rawCursor) <= width ? rawCursor : " ";
  const cursorWidth = Math.max(1, terminalWidth(cursorText));
  const leftChars = chars.slice(0, safeCursor);
  const rightChars = chars.slice(safeCursor + (safeCursor < chars.length ? 1 : 0));
  const leftText = leftChars.join("");
  const rightText = rightChars.join("");
  const available = Math.max(0, width - cursorWidth);

  if (terminalWidth(leftText) + terminalWidth(rightText) <= available) {
    return { left: leftText, cursor: cursorText, right: rightText };
  }

  const leftWidth = terminalWidth(leftText);
  const rightWidth = terminalWidth(rightText);
  let rightBudget = Math.min(rightWidth, Math.floor(available / 2));
  let leftBudget = available - rightBudget;

  if (leftWidth < leftBudget) {
    leftBudget = leftWidth;
    rightBudget = available - leftBudget;
  }
  if (rightWidth < rightBudget) {
    rightBudget = rightWidth;
    leftBudget = available - rightBudget;
  }

  return {
    left: tailCellsWithMarker(leftChars, leftBudget),
    cursor: cursorText,
    right: headCellsWithMarker(rightChars, rightBudget),
  };
}

function tailCellsWithMarker(chars: string[], width: number): string {
  const text = chars.join("");
  if (width <= 0) {
    return "";
  }
  if (terminalWidth(text) <= width) {
    return text;
  }
  if (width === 1) {
    return "<";
  }

  return `<${takeTailCells(chars, width - 1)}`;
}

function headCellsWithMarker(chars: string[], width: number): string {
  const text = chars.join("");
  if (width <= 0) {
    return "";
  }
  if (terminalWidth(text) <= width) {
    return text;
  }
  if (width === 1) {
    return ">";
  }

  return `${truncateCells(text, width - 1)}>`;
}

function takeTailCells(chars: string[], width: number): string {
  let result = "";
  let used = 0;
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index] || "";
    const charWidth = terminalWidth(char);
    if (used + charWidth > width) {
      break;
    }
    result = `${char}${result}`;
    used += charWidth;
  }
  return result;
}

export function clampCursor(cursor: number, length: number): number {
  if (!Number.isFinite(cursor)) {
    return 0;
  }
  return Math.max(0, Math.min(length, cursor));
}
