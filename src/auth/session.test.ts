import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors.js";

const mocks = vi.hoisted(() => ({
  getAuthSetupStatus: vi.fn(),
  login: vi.fn(),
  setup: vi.fn(),
  logout: vi.fn(),
  storeGet: vi.fn(),
  storeSet: vi.fn(),
  storeDelete: vi.fn(),
  loadProfile: vi.fn(),
  saveProfile: vi.fn(),
}));

vi.mock("../api/client.js", () => ({
  DashboardClient: class {
    constructor(_options: { baseUrl: string; token?: string }) {}
    getAuthSetupStatus = mocks.getAuthSetupStatus;
    login = mocks.login;
    setup = mocks.setup;
    logout = mocks.logout;
  },
}));

vi.mock("./tokenStore.js", () => ({
  createTokenStore: async () => ({
    kind: "file",
    get: mocks.storeGet,
    set: mocks.storeSet,
    delete: mocks.storeDelete,
  }),
}));

vi.mock("../config/index.js", () => ({
  normalizeServerUrl: (value: string | undefined) =>
    value?.trim().replace(/\/+$/, "") || "http://localhost:6185",
  resolveServerUrl: (value?: string) => value || "http://localhost:6185",
  loadProfile: mocks.loadProfile,
  saveProfile: mocks.saveProfile,
}));

const {
  DashboardSetupCompletedError,
  DashboardSetupRequiredError,
  isServerSetupRequired,
  isTotpRequiredError,
  login,
} =
  await import("./session.js");

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAuthSetupStatus.mockResolvedValue({ setup_required: false });
  mocks.login.mockResolvedValue({ token: "jwt", username: "astrbot" });
  mocks.setup.mockResolvedValue({ token: "jwt", username: "astrbot" });
  mocks.storeSet.mockResolvedValue(undefined);
  mocks.saveProfile.mockResolvedValue(undefined);
});

describe("dashboard authentication", () => {
  it("uses normal login when an older Dashboard returns 404 for setup-status", async () => {
    mocks.getAuthSetupStatus.mockRejectedValue(new ApiError("Not found", 404));

    const result = await login({
      serverUrl: "http://localhost:6185/",
      username: "astrbot",
      password: "secret",
    });

    expect(mocks.login).toHaveBeenCalledWith("astrbot", "secret", undefined);
    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.storeSet).toHaveBeenCalledWith("http://localhost:6185", "jwt");
    expect(result.username).toBe("astrbot");
  });

  it("requires an explicit password confirmation before creating the first account", async () => {
    mocks.getAuthSetupStatus.mockResolvedValue({ setup_required: true });

    await expect(
      login({
        serverUrl: "http://localhost:6185",
        username: "astrbot",
        password: "secret",
      }),
    ).rejects.toBeInstanceOf(DashboardSetupRequiredError);
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.setup).not.toHaveBeenCalled();
  });

  it("creates the first account only after password confirmation matches", async () => {
    mocks.getAuthSetupStatus.mockResolvedValue({ setup_required: true });

    await expect(
      login({
        serverUrl: "http://localhost:6185",
        username: "astrbot",
        password: "secret",
        confirmPassword: "different",
      }),
    ).rejects.toThrow("Passwords do not match");
    expect(mocks.setup).not.toHaveBeenCalled();

    const result = await login({
      serverUrl: "http://localhost:6185",
      username: "astrbot",
      password: "secret",
      confirmPassword: "secret",
    });
    expect(mocks.setup).toHaveBeenCalledWith("astrbot", "secret", "secret");
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.saveProfile).toHaveBeenCalledWith({
      serverUrl: "http://localhost:6185",
      username: "astrbot",
    });
    expect(result.username).toBe("astrbot");
  });

  it("does not silently switch a confirmed first-setup form into ordinary login", async () => {
    await expect(
      login({
        serverUrl: "http://localhost:6185",
        username: "astrbot",
        password: "secret",
        confirmPassword: "secret",
      }),
    ).rejects.toBeInstanceOf(DashboardSetupCompletedError);
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.setup).not.toHaveBeenCalled();
  });

  it("does not turn unrelated 401 responses into TOTP prompts", async () => {
    expect(
      isTotpRequiredError(new ApiError("Invalid password", 401, { error_code: "invalid" })),
    ).toBe(false);
    expect(
      isTotpRequiredError(new ApiError("TOTP required", 401, { totp_required: true })),
    ).toBe(true);
  });

  it("surfaces setup-status failures other than 404", async () => {
    mocks.getAuthSetupStatus.mockRejectedValue(new ApiError("Forbidden", 403));
    await expect(isServerSetupRequired("http://localhost:6185")).rejects.toThrow("Forbidden");
  });
});
