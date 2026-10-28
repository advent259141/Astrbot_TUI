import { describe, expect, it } from "vitest";
import { truncate, wrapText } from "./format.js";
import { terminalWidth, truncateCells } from "./terminal.js";
import { nextMainView, visibleMainViews } from "./appHelpers.js";
import { createI18n } from "../i18n/index.js";

describe("terminal cell layout", () => {
  it("measures Chinese and complete emoji graphemes", () => {
    expect(terminalWidth("中文abc")).toBe(7);
    expect(terminalWidth("e\u0301")).toBe(1);
    expect(terminalWidth("👩‍💻🇨🇳❤️")).toBe(6);
    expect(truncateCells("a👩‍💻b", 2)).toBe("a");
    expect(truncateCells("a👩‍💻b", 3)).toBe("a👩‍💻");
  });

  it("wraps Chinese content without dropping cells or splitting emoji", () => {
    const text = "中文消息👩‍💻测试abc";
    const lines = wrapText(text, 6);
    expect(lines.join("")).toBe(text);
    expect(lines.every((line) => terminalWidth(line) <= 6)).toBe(true);
    expect(wrapText("a\n\nb", 4)).toEqual(["a", "", "b"]);
    expect(truncate("中文abcdef", 7)).toBe("中文...");
  });

  it("keeps the current navigation tab visible on narrow terminals", () => {
    const i18n = createI18n("zh-CN");
    expect(visibleMainViews("management", 40, i18n)).toContain("management");
    expect(visibleMainViews("chat", 40, i18n)[0]).toBe("chat");
    expect(nextMainView("chat", -1)).toBe("management");
    expect(nextMainView("management")).toBe("chat");
  });
});
