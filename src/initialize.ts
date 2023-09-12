import { registerWallet } from '@wallet-standard/wallet';
import { SolflareMetaMaskWallet } from './wallet';
import { detectEthereumProvider } from './detect';

let isInitialized = false;

export function initialize(): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  registerWallet(new SolflareMetaMaskWallet());
}

export async function initializeWhenDetected(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (!(await detectEthereumProvider())) {
    return;
  }

  initialize();
}
