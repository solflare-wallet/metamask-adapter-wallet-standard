export interface MetaMaskEthereumProvider {
  isMetaMask?: boolean;
  once(eventName: string | symbol, listener: (...args: any[]) => void): this;
  on(eventName: string | symbol, listener: (...args: any[]) => void): this;
  off(eventName: string | symbol, listener: (...args: any[]) => void): this;
  addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  request: (...args) => any;
  providers?: MetaMaskEthereumProvider[];
}

export function getMetamaskProvider(provider: MetaMaskEthereumProvider) {
  try {
    if (provider.isMetaMask) {
      return provider;
    }

    if (provider.providers) {
      const providers = provider.providers;

      for (const provider of providers) {
        if (provider.isMetaMask) {
          return provider;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function isSnapSupported(provider: MetaMaskEthereumProvider) {
  try {
    await provider.request({ method: 'wallet_getSnaps' });
    return true;
  } catch (error) {
    return false;
  }
}
