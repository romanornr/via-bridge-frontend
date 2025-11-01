import * as React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useWalletStore } from '@/store/wallet-store';

const WalletsSelectorContainer = dynamic(() => import('./selector-container'), { ssr: false });

export function WalletConnectButton() {
  const [showSelector, setShowSelector] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const isMetamaskConnected = useWalletStore((state) => state.isMetamaskConnected);
  
  // Reset connecting state when connected
  React.useEffect(() => {
    if (isMetamaskConnected) {
      setIsConnecting(false);
      setShowSelector(false);
    }
  }, [isMetamaskConnected]);
  
  const handleClick = () => {
    setIsConnecting(true);
    setShowSelector(true);
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect EVM Wallet'
        )}
      </Button>
      {showSelector && (
        <div style={{ position: 'fixed', zIndex: 9999 }}>
          <WalletsSelectorContainer
            initialOpen={true}
            onClose={() => {
              setShowSelector(false);
              setIsConnecting(false);
            }}
            showTrigger={false}
          />
        </div>
      )}
    </>
  );
}