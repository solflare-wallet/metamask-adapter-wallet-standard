import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignAndSendTransactionMethod,
  type SolanaSignAndSendTransactionOutput,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  type SolanaSignMessageMethod,
  type SolanaSignMessageOutput,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionMethod,
  type SolanaSignTransactionOutput
} from '@solana/wallet-standard-features';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { Wallet } from '@wallet-standard/base';
import {
  StandardConnect,
  type StandardConnectFeature,
  type StandardConnectMethod,
  StandardDisconnect,
  type StandardDisconnectFeature,
  type StandardDisconnectMethod,
  StandardEvents,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsNames,
  type StandardEventsOnMethod
} from '@wallet-standard/features';
import bs58 from 'bs58';
import { SolflareMetamaskWalletAccount } from './account.js';
import { icon } from './icon.js';
import type { SolanaChain } from './solana.js';
import { isSolanaChain, SOLANA_CHAINS } from './solana.js';
import Solflare from '@solflare-wallet/metamask-sdk';

export const SolflareNamespace = 'solflare:';

export type SolflareMetamaskFeature = {
  [SolflareNamespace]: {
    solflare: Solflare;
  };
};

export class SolflareMetamaskWallet implements Wallet {
  readonly #listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {};
  readonly #version = '1.0.0' as const;
  readonly #name = 'MetaMask x Solflare' as const;
  readonly #icon = icon;
  #account: SolflareMetamaskWalletAccount | null = null;
  readonly #solflare: Solflare;

  get version() {
    return this.#version;
  }

  get name() {
    return this.#name;
  }

  get icon() {
    return this.#icon;
  }

  get chains() {
    return SOLANA_CHAINS.slice();
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignTransactionFeature &
    SolanaSignMessageFeature &
    SolflareMetamaskFeature {
    return {
      [StandardConnect]: {
        version: '1.0.0',
        connect: this.#connect
      },
      [StandardDisconnect]: {
        version: '1.0.0',
        disconnect: this.#disconnect
      },
      [StandardEvents]: {
        version: '1.0.0',
        on: this.#on
      },
      [SolanaSignAndSendTransaction]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signAndSendTransaction: this.#signAndSendTransaction
      },
      [SolanaSignTransaction]: {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: this.#signTransaction
      },
      [SolanaSignMessage]: {
        version: '1.0.0',
        signMessage: this.#signMessage
      },
      [SolflareNamespace]: {
        solflare: this.#solflare
      }
    };
  }

  get accounts() {
    return this.#account ? [this.#account] : [];
  }

  constructor(instance: Solflare) {
    if (new.target === SolflareMetamaskWallet) {
      Object.freeze(this);
    }

    this.#solflare = instance;

    instance.on('connect', this.#connected, this);
    instance.on('disconnect', this.#disconnected, this);
    instance.on('accountChanged', this.#reconnected, this);

    this.#connected();
  }

  #on: StandardEventsOnMethod = (event, listener) => {
    this.#listeners[event]?.push(listener) || (this.#listeners[event] = [listener]);
    return (): void => this.#off(event, listener);
  };

  #emit<E extends StandardEventsNames>(
    event: E,
    ...args: Parameters<StandardEventsListeners[E]>
  ): void {
    // eslint-disable-next-line prefer-spread
    this.#listeners[event]?.forEach((listener) => listener.apply(null, args));
  }

  #off<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): void {
    this.#listeners[event] = this.#listeners[event]?.filter(
      (existingListener) => listener !== existingListener
    );
  }

  #connected = () => {
    const address = this.#solflare.publicKey?.toString();
    if (address) {
      if (!this.#account || this.#account.address !== address) {
        this.#account = new SolflareMetamaskWalletAccount({
          address,
          publicKey: this.#solflare.publicKey!.toBytes()
        });
        this.#emit('change', { accounts: this.accounts });
      }
    }
  };

  #disconnected = () => {
    if (this.#account) {
      this.#account = null;
      this.#emit('change', { accounts: this.accounts });
    }
  };

  #reconnected = () => {
    if (this.#solflare.publicKey) {
      this.#connected();
    } else {
      this.#disconnected();
    }
  };

  #connect: StandardConnectMethod = async () => {
    if (!this.#account) {
      await this.#solflare.connect();
    }

    this.#connected();

    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectMethod = async () => {
    await this.#solflare.disconnect();
  };

  #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (...inputs) => {
    if (!this.#account) throw new Error('not connected');

    const outputs: SolanaSignAndSendTransactionOutput[] = [];

    if (inputs.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { transaction, account, chain, options } = inputs[0]!;
      const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {};
      if (account !== this.#account) throw new Error('invalid account');
      if (!isSolanaChain(chain)) throw new Error('invalid chain');

      const signature = await this.#solflare.signAndSendTransaction(
        VersionedTransaction.deserialize(transaction),
        {
          preflightCommitment,
          minContextSlot,
          maxRetries,
          skipPreflight
        }
      );

      outputs.push({ signature: bs58.decode(signature) });
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this.#signAndSendTransaction(input)));
      }
    }

    return outputs;
  };

  #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    if (!this.#account) throw new Error('not connected');

    const outputs: SolanaSignTransactionOutput[] = [];

    if (inputs.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { transaction, account, chain } = inputs[0]!;
      if (account !== this.#account) throw new Error('invalid account');
      if (chain && !isSolanaChain(chain)) throw new Error('invalid chain');

      const signedTransaction = await this.#solflare.signTransaction(
        VersionedTransaction.deserialize(transaction)
      );

      outputs.push({ signedTransaction: signedTransaction.serialize() });
    } else if (inputs.length > 1) {
      let chain: SolanaChain | undefined;
      for (const input of inputs) {
        if (input.account !== this.#account) throw new Error('invalid account');
        if (input.chain) {
          if (!isSolanaChain(input.chain)) throw new Error('invalid chain');
          if (chain) {
            if (input.chain !== chain) throw new Error('conflicting chain');
          } else {
            chain = input.chain;
          }
        }
      }

      const transactions = inputs.map(({ transaction }) => Transaction.from(transaction));

      const signedTransactions = await this.#solflare.signAllTransactions(transactions);

      outputs.push(
        ...signedTransactions.map((signedTransaction) => ({
          signedTransaction: signedTransaction.serialize()
        }))
      );
    }

    return outputs;
  };

  #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    if (!this.#account) throw new Error('not connected');

    const outputs: SolanaSignMessageOutput[] = [];

    if (inputs.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { message, account } = inputs[0]!;
      if (account !== this.#account) throw new Error('invalid account');

      const signature = await this.#solflare.signMessage(message);

      outputs.push({ signedMessage: message, signature });
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this.#signMessage(input)));
      }
    }

    return outputs;
  };
}
