import React from "react";
import { PassThrough, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import { render } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../i18n/index.js";
import { SetupView } from "./SetupView.js";

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

function mount(serverUrl = "http://localhost:6185") {
  let frame = "";
  const onSubmit = vi.fn(async () => {});
  const stdout = Object.assign(new Writable({ write(chunk, _encoding, done) { frame = stripVTControlCharacters(String(chunk)); done(); } }), { columns: 100, rows: 32, isTTY: true });
  const stdin = Object.assign(new PassThrough(), { isTTY: true, setRawMode() {}, ref() {}, unref() {} });
  const instance = render(React.createElement(SetupView, { i18n: createI18n("en-US"), defaultServerUrl: serverUrl, defaultUsername: "astrbot", onSubmit }), { stdout: stdout as unknown as NodeJS.WriteStream, stdin: stdin as unknown as NodeJS.ReadStream, stderr: stdout as unknown as NodeJS.WriteStream, debug: true, patchConsole: false, exitOnCtrlC: false });
  cleanups.push(() => { instance.unmount(); instance.cleanup(); stdin.destroy(); stdout.destroy(); });
  const type = async (input: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write(input);
  };
  const submit = async () => { await type("\t"); await type("\t"); await type("secret"); await type("\r"); };
  return { frame: () => frame, type, submit, onSubmit };
}

describe("setup text editing", () => {
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
