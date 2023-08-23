import { registerWallet } from './register.js';
import { SolflareMetamaskWallet } from './wallet.js';
import SolflareMetamask from '@solflare-wallet/metamask-sdk';

let isInitialized = false;

export function initialize(instance?: SolflareMetamask): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  registerWallet(new SolflareMetamaskWallet(instance ?? new SolflareMetamask()));
}

export async function initializeWhenDetected(instance?: SolflareMetamask): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (!(await SolflareMetamask.isSupported())) {
    return;
  }

  initialize(instance);
}
