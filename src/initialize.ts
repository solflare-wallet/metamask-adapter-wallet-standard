import { registerWallet } from './register.js';
import { SolflareMetamaskWallet } from './wallet.js';
import Solflare from '@solflare-wallet/metamask-sdk';

export function initialize(instance?: Solflare): void {
  registerWallet(new SolflareMetamaskWallet(instance ?? new Solflare()));
}
