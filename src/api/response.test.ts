import { describe, expect, it } from "vitest";
import { ApiError } from "./errors.js";
import { unwrapApiEnvelope } from "./response.js";

describe("unwrapApiEnvelope", () => {
  it("returns data for ok responses", () => {
    expect(
      unwrapApiEnvelope<{ token: string }>({
        status: "ok",
        data: { token: "abc" },
      }),
    ).toEqual({ token: "abc" });
  });

  it("throws the dashboard message for error responses", () => {
    expect(() =>
      unwrapApiEnvelope({
        status: "error",
        message: "bad credentials",
        data: {},
      }),
    ).toThrow(new ApiError("bad credentials"));
  });

  it("returns data for warning responses", () => {
    expect(
      unwrapApiEnvelope<{ can_ignore: boolean }>({
        status: "warning",
        message: "version mismatch",
        data: { can_ignore: true },
      }),
    ).toEqual({ can_ignore: true });
  });

  it("throws for malformed responses", () => {
    expect(() => unwrapApiEnvelope(null)).toThrow("Invalid Dashboard response.");
    expect(() => unwrapApiEnvelope({ status: "wat" })).toThrow(
      "Unexpected Dashboard response status.",
    );
  });
});
