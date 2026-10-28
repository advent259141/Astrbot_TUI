import { useEffect, useRef } from "react";
import { useInput, useStdin } from "ink";

/** Preserve Backspace/Delete semantics across terminals while using Ink's input parser. */
export function useTerminalInput(
  handler: Parameters<typeof useInput>[0],
  options: Parameters<typeof useInput>[1] = {},
): void {
  const { internal_eventEmitter } = useStdin();
  const rawInput = useRef("");
  useEffect(() => {
    if (options.isActive === false) return;
    // Ink 5 maps both DEL (Backspace) and ESC[3~ (Delete) to key.delete.
    // Capture its raw input before its listeners discard that distinction.
    const capture = (input: string) => { rawInput.current = input; };
    internal_eventEmitter.prependListener("input", capture);
    return () => { internal_eventEmitter.removeListener("input", capture); };
  }, [internal_eventEmitter, options.isActive]);

  useInput((input, key) => {
    if (/^[\b\u007f]+$/.test(rawInput.current)) {
      for (const _char of rawInput.current) handler("", { ...key, backspace: true, delete: false });
      return;
    }
    const isBackspace = key.delete && (rawInput.current === "\u007f" || rawInput.current === "\u001b\u007f");
    handler(input, isBackspace ? { ...key, backspace: true, delete: false } : key);
  }, options);
}
