import React from "react";
import { PassThrough, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import { render } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../i18n/index.js";
import { SetupView } from "./SetupView.js";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

function mount(serverUrl = "http://localhost:6185", locale = "en-US") {
  let frame = "";
  const onSubmit = vi.fn(async () => {});
  const stdout = Object.assign(new Writable({ write(chunk, _encoding, done) { frame = stripVTControlCharacters(String(chunk)); done(); } }), { columns: 100, rows: 32, isTTY: true });
  const stdin = Object.assign(new PassThrough(), { isTTY: true, setRawMode() {}, ref() {}, unref() {} });
  const instance = render(React.createElement(SetupView, { i18n: createI18n(locale), defaultServerUrl: serverUrl, defaultUsername: "astrbot", onSubmit }), { stdout: stdout as unknown as NodeJS.WriteStream, stdin: stdin as unknown as NodeJS.ReadStream, stderr: stdout as unknown as NodeJS.WriteStream, debug: true, patchConsole: false, exitOnCtrlC: false });
  cleanups.push(() => { instance.unmount(); instance.cleanup(); stdin.destroy(); stdout.destroy(); });
  const type = async (input: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write(input);
  };
  const submit = async () => { await type("\t"); await type("\t"); await type("secret"); await type("\r"); };
  return { frame: () => frame, type, submit, onSubmit };
}

describe("setup text editing", () => {
  it.each(["en-US", "zh-CN"])("keeps a pasted URL on one row after clearing the field (%s)", async (locale) => {
    const app = mount("http://localhost:6185", locale);
    await app.type("\u0015");
    await app.type("https://astr.advent259.site/");
    await vi.waitFor(() => expect(app.frame()).toContain("| https://astr.advent259.site/"));
    expect(app.frame().split("\n").length).toBeLessThanOrEqual(33);
  });
  it("keeps pasted usernames and masked passwords on their input rows", async () => {
    const app = mount();
    await app.type("\t");
    await app.type("\u0015");
    await app.type("测试用户🙂");
    await vi.waitFor(() => expect(app.frame()).toContain("| 测试用户🙂"));
    await app.type("\t");
    await app.type("pasted-secret");
    await vi.waitFor(() => expect(app.frame()).toContain("| *************"));
    expect(app.frame()).not.toContain("pasted-secret");
    expect(app.frame().split("\n").length).toBeLessThanOrEqual(33);
    await app.type("\r");
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ username: "测试用户🙂", password: "pasted-secret" })));
  });

  it("crops a long pasted address without wrapping or changing its saved value", async () => {
    const app = mount();
    const address = "https://example.com/" + "proxy/".repeat(20);
    await app.type("\u0015");
    await app.type(address);
    await vi.waitFor(() => expect(app.frame()).toContain("| <"));
    expect(app.frame().split("\n").length).toBeLessThanOrEqual(33);
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: address })));
  });
  it.each(["\b", "\u007f"])("erases backwards for terminal Backspace %j", async (sequence) => {
    const app = mount();
    await vi.waitFor(() => expect(app.frame()).toContain("http://localhost:6185"));
    await app.type(sequence);
    await vi.waitFor(() => expect(app.frame()).not.toContain("http://localhost:6185"));
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: "http://localhost:618", password: "secret" })));
  });

  it("keeps the actual Delete key deleting forwards", async () => {
    const app = mount("http://example.com/ab");
    await app.type("\u001b[D");
    await app.type("\u001b[3~");
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: "http://example.com/a" })));
  });

  it("clears a pasted address with Ctrl+U before entering a replacement", async () => {
    const app = mount();
    await app.type("https://example.com/https://example.com/");
    await app.type("\u0015");
    await app.type("https://example.com");
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: "https://example.com" })));
  });

  it("erases repeated Backspace events delivered in one terminal chunk", async () => {
    const app = mount("http://localhost:6185abc");
    await app.type("\u007f\u007f\u007f");
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: "http://localhost:6185" })));
  });

  it("keeps cursor positions correct when deleting Unicode text", async () => {
    const app = mount("http://example.com/🙂Z");
    await app.type("\u001b[D");
    await app.type("\u007f");
    await app.submit();
    await vi.waitFor(() => expect(app.onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serverUrl: "http://example.com/Z" })));
  });
});
