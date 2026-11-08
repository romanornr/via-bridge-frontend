/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getERC20Balance } from "./balance";

// Mock ethers module
vi.mock("ethers", () => ({
  BrowserProvider: vi.fn(),
  Contract: vi.fn(),
  formatUnits: vi.fn(),
  isError: vi.fn((error: unknown, code: string) => {
    return error && typeof error === "object" && "code" in error && (error as { code: string }).code === code;
  }),
}));

// Mock the contract utility
vi.mock("./contract", () => ({
  isContractDeployed: vi.fn(),
}));

// Mock the abis module
vi.mock("./abis", () => ({
  ERC20_ABI: [],
}));

describe("getERC20Balance", () => {
  const mockTokenAddress = "0x327d741E500E11Ab69F9D1A496A0ab4F934fA463";
  const mockWalletAddress = "0x1234567890123456789012345678901234567890";
  const mockDecimals = 6;
  const mockEIP1193Provider = { request: vi.fn() } as unknown as EIP1193Provider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no contract exists at address", async () => {
    const { isContractDeployed } = await import("./contract");
    vi.mocked(isContractDeployed).mockResolvedValue(false);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getERC20Balance(mockEIP1193Provider, mockTokenAddress, mockWalletAddress, mockDecimals);

    expect(isContractDeployed).toHaveBeenCalledWith(mockEIP1193Provider, mockTokenAddress);
    expect(result.balance).toBeNull();
    expect(result.error).toBe("Contract does not exist");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("No contract deployed"));

    warnSpy.mockRestore();
  });

  it("fetches balance successfully when contract exists", async () => {
    const { isContractDeployed } = await import("./contract");
    const { BrowserProvider, Contract, formatUnits } = await import("ethers");

    vi.mocked(isContractDeployed).mockResolvedValue(true);

    const mockBalanceOf = vi.fn().mockResolvedValue(BigInt("1000000")); // 1 USDC
    const mockProvider = {};
    const mockContract = { balanceOf: mockBalanceOf };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );
    vi.mocked(Contract).mockImplementation(
      function () { return mockContract as unknown as InstanceType<typeof Contract>; }
    );
    vi.mocked(formatUnits).mockReturnValue("1.0");

    const result = await getERC20Balance(mockEIP1193Provider, mockTokenAddress, mockWalletAddress, mockDecimals);

    expect(isContractDeployed).toHaveBeenCalledWith(mockEIP1193Provider, mockTokenAddress);
    expect(mockBalanceOf).toHaveBeenCalledWith(mockWalletAddress);
    expect(result.balance).toBe("1.0");
    expect(result.error).toBeNull();
  });

  it("handles BAD_DATA error gracefully", async () => {
    const { isContractDeployed } = await import("./contract");
    const { BrowserProvider, Contract } = await import("ethers");

    vi.mocked(isContractDeployed).mockResolvedValue(true);

    // Create an error with the code property like ethers does
    const badDataError = new Error('could not decode result data (value="0x")');
    (badDataError as unknown as { code: string }).code = "BAD_DATA";
    const mockBalanceOf = vi.fn().mockRejectedValue(badDataError);
    const mockProvider = {};
    const mockContract = { balanceOf: mockBalanceOf };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );
    vi.mocked(Contract).mockImplementation(
      function () { return mockContract as unknown as InstanceType<typeof Contract>; }
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getERC20Balance(mockEIP1193Provider, mockTokenAddress, mockWalletAddress, mockDecimals);

    expect(result.balance).toBeNull();
    expect(result.error).toBe("Contract does not implement balanceOf");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("may not implement balanceOf")
    );

    warnSpy.mockRestore();
  });

  it("handles generic errors gracefully", async () => {
    const { isContractDeployed } = await import("./contract");
    const { BrowserProvider, Contract } = await import("ethers");

    vi.mocked(isContractDeployed).mockResolvedValue(true);

    const mockBalanceOf = vi.fn().mockRejectedValue(new Error("Network error"));
    const mockProvider = {};
    const mockContract = { balanceOf: mockBalanceOf };

    vi.mocked(BrowserProvider).mockImplementation(
      function () { return mockProvider as unknown as InstanceType<typeof BrowserProvider>; }
    );
    vi.mocked(Contract).mockImplementation(
      function () { return mockContract as unknown as InstanceType<typeof Contract>; }
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getERC20Balance(mockEIP1193Provider, mockTokenAddress, mockWalletAddress, mockDecimals);

    expect(result.balance).toBeNull();
    expect(result.error).toBe("Network error");
    expect(errorSpy).toHaveBeenCalledWith("Error fetching balance:", expect.any(Error));

    errorSpy.mockRestore();
  });
});
