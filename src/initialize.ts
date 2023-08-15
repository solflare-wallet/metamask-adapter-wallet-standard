import { registerWallet } from './register.js';
import { SolflareMetamaskWallet } from './wallet.js';
import Solflare from '@solflare-wallet/metamask-sdk';
import detectEthereumProvider from '@metamask/detect-provider';
import { getMetamaskProvider, isSnapSupported, MetaMaskEthereumProvider } from './provider';

export function initialize(instance?: Solflare): void {
  registerWallet(new SolflareMetamaskWallet(instance ?? new Solflare()));
}

export async function initializeWhenDetected(instance?: Solflare): Promise<void> {
  const provider = await detectEthereumProvider({ silent: true });

  if (!provider) {
    return;
  }

  const metamaskProvider = getMetamaskProvider(provider as MetaMaskEthereumProvider);

  if (!metamaskProvider) {
    return;
  }

  const snapSupported = await isSnapSupported(metamaskProvider);

  if (!snapSupported) {
    return;
  }

  initialize(instance);
}
