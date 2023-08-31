import { registerWallet } from './register.js';
import { SolflareMetaMaskWallet } from './wallet.js';
import SolflareMetaMask from '@solflare-wallet/metamask-sdk';

let isInitialized = false;

export function initialize(instance?: SolflareMetaMask): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  registerWallet(new SolflareMetaMaskWallet(instance ?? new SolflareMetaMask()));
}

export async function initializeWhenDetected(instance?: SolflareMetaMask): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (!(await SolflareMetaMask.isSupported())) {
    return;
  }

  initialize(instance);
}
