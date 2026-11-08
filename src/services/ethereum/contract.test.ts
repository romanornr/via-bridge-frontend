/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isContractDeployed } from "./contract";

// Mock ethers module
vi.mock("ethers", () => ({
  BrowserProvider: vi.fn(),
}));

describe("isContractDeployed", () => {
  const mockAddress = "0x327d741E500E11Ab69F9D1A496A0ab4F934fA463";
  const mockProvider = { request: vi.fn() } as unknown as EIP1193Provider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when getCode returns 0x (no contract)", async () => {
    const { BrowserProvider } = await import("ethers");
    const mockGetCode = vi.fn().mockResolvedValue("0x");
    const mockBrowserProvider = { getCode: mockGetCode };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockBrowserProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );

    const result = await isContractDeployed(mockProvider, mockAddress);

    expect(mockGetCode).toHaveBeenCalledWith(mockAddress);
    expect(result).toBe(false);
  });

  it("returns true when getCode returns bytecode (contract exists)", async () => {
    const { BrowserProvider } = await import("ethers");
    const mockGetCode = vi
      .fn()
      .mockResolvedValue("0x608060405234801561001057600080fd5b50");
    const mockBrowserProvider = { getCode: mockGetCode };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockBrowserProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );

    const result = await isContractDeployed(mockProvider, mockAddress);

    expect(mockGetCode).toHaveBeenCalledWith(mockAddress);
    expect(result).toBe(true);
  });

  it("returns false when getCode throws an error", async () => {
    const { BrowserProvider } = await import("ethers");
    const mockGetCode = vi.fn().mockRejectedValue(new Error("RPC error"));
    const mockBrowserProvider = { getCode: mockGetCode };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockBrowserProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await isContractDeployed(mockProvider, mockAddress);

    expect(result).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Error checking contract deployment:",
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
