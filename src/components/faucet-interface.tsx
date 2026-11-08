"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, CheckCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { getTransactionHash, requestFaucetFunds } from "@/services/api/faucet";
import { useWalletState } from "@/hooks/use-wallet-state";
import AltchaWidget, { AltchaWidgetRef } from "@/components/altcha-widget";
import { useAltcha } from "@/hooks/use-altcha";
import { API_BASE_URL, getNetworkConfig } from "@/services/config";
import { WalletConnectButton } from "@/components/wallets/connect-button";

interface FaucetRequest {
  address: string;
  txHash?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function FaucetInterface() {
  const {
    viaAddress,
    isMetamaskConnected,
  } = useWalletState();


  const altchaRef = useRef<AltchaWidgetRef>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { altchaState, handleVerify, handleError, resetAltcha } = useAltcha();

  const [faucetRequest, setFaucetRequest] = useState<FaucetRequest>({
    address: viaAddress || "",
    status: 'idle'
  });

  // Get AltCHA URLs from environment
  const altchaChallengeUrl = `${API_BASE_URL}/faucet/altcha-challenge`;

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const handleAddressChange = (value: string) => {
    setFaucetRequest(prev => ({
      ...prev,
      address: value,
      status: 'idle',
      error: undefined
    }));
  };

  useEffect(() => {
    if (viaAddress) {
      setFaucetRequest(prev => ({
        ...prev,
        address: viaAddress,
        status: 'idle',
        error: undefined
      }));
    }
  }, [viaAddress]);

  const handleRequestFunds = async () => {
    if (!faucetRequest.address.trim()) {
      setFaucetRequest(prev => ({
        ...prev,
        status: 'error',
        error: 'Please enter a valid VIA address'
      }));
      return;
    }

    if (altchaChallengeUrl && !altchaState.isVerified) {
      setFaucetRequest(prev => ({
        ...prev,
        status: 'error',
        error: 'Please complete the security verification'
      }));
      return;
    }

    setFaucetRequest(prev => ({ ...prev, status: 'loading' }));

    try {
      const result = await requestFaucetFunds(faucetRequest.address, altchaState.token!);

      if (result.success) {
        startPollingForTransactionHash(faucetRequest.address);
        toast.success("Faucet Request Submitted", {
          description: `Request submitted for ${faucetRequest.address.slice(0, 6)}...${faucetRequest.address.slice(-4)}. Checking for transaction...`,
          duration: 10000,
          dismissible: false,
        });
      } else {
        setFaucetRequest(prev => ({
          ...prev,
          status: 'error',
          error: result.error || 'Failed to request funds from faucet'
        }));
        resetAltcha();
        altchaRef.current?.reset();
        toast.error("Faucet Request Failed", {
          description: result.error || 'Failed to request funds from faucet',
          duration: 10000
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setFaucetRequest(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));
      resetAltcha();
      altchaRef.current?.reset();
      toast.error("Faucet Request Failed", {
        description: errorMessage,
        duration: 10000
      });
    }
  };

  const isValidAddress = (address: string) => {
    return address.startsWith('0x') && address.length === 42;
  };

  // Helper function to clear polling intervals and timeouts
  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  // Helper function to reset AltCHA and clear polling
  const resetAndClearPolling = () => {
    resetAltcha();
    altchaRef.current?.reset();
    clearPolling();
  };

  // Helper function to handle polling timeout/error
  const handlePollingTimeout = (errorMessage: string, toastTitle: string) => {
    setFaucetRequest(prev => ({
      ...prev,
      status: 'error',
      error: errorMessage
    }));
    resetAndClearPolling();
    toast.error(toastTitle, {
      description: errorMessage,
      duration: 8000
    });
  };

  const startPollingForTransactionHash = (address: string) => {
    let attempts = 0;
    const maxAttempts = 6; // 6 attempts * 10 seconds = 60 seconds (1 minute)

    const poll = async () => {
      attempts++;

      try {
        const transactionHash = await getTransactionHash(address);

        if (transactionHash.success && transactionHash.data) {
          setFaucetRequest(prev => ({
            ...prev,
            status: 'success',
            txHash: transactionHash.data
          }));

          resetAndClearPolling();
          toast.success("Transaction Confirmed", {
            description: (
              <span>
                Check the transaction on the explorer{' '}
                <a
                  href={`${getNetworkConfig().blockExplorerUrls[0]}/tx/0x${transactionHash.data}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  0x{transactionHash.data}
                </a>
              </span>
            ),
            duration: 10000,
            dismissible: false,
          });

          return;
        }

        if (transactionHash.error) {
          handlePollingTimeout(
            'Something went wrong. Please check your wallet for balance updates.',
            'Transaction Check Failed'
          );
        }

        if (attempts >= maxAttempts) {
          handlePollingTimeout(
            'Transaction not found after 1 minute. Please check your wallet for balance updates.',
            'Transaction Check Timeout'
          );
        }
      } catch (error) {
        console.error("Error polling for transaction hash:", error);

        if (attempts >= maxAttempts) {
          handlePollingTimeout(
            'Unable to verify transaction. Please check your wallet for balance updates.',
            'Transaction Verification Failed'
          );
        }
      }
    };

    poll();

    pollingIntervalRef.current = setInterval(poll, 10000); // Poll every 10 seconds

    pollingTimeoutRef.current = setTimeout(() => {
      clearPolling();

      setFaucetRequest(prev => {
        if (prev.status === 'loading') {
          return {
            ...prev,
            status: 'error',
            error: 'Transaction not found after 1 minute. Please check your wallet for balance updates.'
          };
        }
        return prev;
      });

      toast.error("Transaction Check Timeout", {
        description: "Transaction not found after 1 minute. Please check your wallet for balance updates.",
        duration: 10000
      });
    }, 70000);
  };

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Request VIA Testnet BTC
          </CardTitle>
          <CardDescription>
            Enter your EVM wallet address to receive VIA Testnet BTC for development and testing.
          </CardDescription>
        </CardHeader>
        {
          !isMetamaskConnected ? (
            <CardContent className="flex justify-center py-6">
              <WalletConnectButton />
            </CardContent>
          ) :
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">VIA Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    placeholder="0x..."
                    value={faucetRequest.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    className={!isValidAddress(faucetRequest.address) && faucetRequest.address ? 'border-red-500' : ''}
                  />
                </div>
                {faucetRequest.address && !isValidAddress(faucetRequest.address) && (
                  <p className="text-sm text-red-500">Please enter a valid VIA address (0x...)</p>
                )}
              </div>

              {faucetRequest.status === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="flex-1">
                    <div className="space-y-2">
                      {faucetRequest.txHash && (
                        <p>Funds are sent successfully with <a
                          href={`${getNetworkConfig().blockExplorerUrls[0]}/tx/0x${faucetRequest.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          transaction
                        </a>!</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {faucetRequest.status === 'error' && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    <div className="space-y-2">
                      <p className="font-medium">Request Failed</p>
                      <p className="text-sm">{faucetRequest.error}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {altchaChallengeUrl && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security Verification
                  </Label>
                  <div className="flex items-center justify-center">
                    <AltchaWidget
                      ref={altchaRef}
                      challengeUrl={altchaChallengeUrl}
                      onVerify={handleVerify}
                      onError={handleError}
                      debug={false}
                      test={false}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleRequestFunds}
                disabled={
                  faucetRequest.status === 'loading' ||
                  !isValidAddress(faucetRequest.address) ||
                  (!!altchaChallengeUrl && !altchaState.isVerified)
                }
                className="w-full"
              >
                {faucetRequest.status === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Requesting Funds...
                  </>
                ) : (
                  <>Request VIA Testnet BTC</>
                )}
              </Button>

              <div className="text-xs text-slate-500 space-y-1">
                <p>• Funds are distributed on VIA testnet</p>
                <p>• Use responsibly for testing purposes only</p>
              </div>
            </CardContent>
        }
      </Card>
    </div>
  );
}
