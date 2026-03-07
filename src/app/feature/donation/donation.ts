import { ChangeDetectionStrategy, Component } from '@angular/core';

interface EthereumProvider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
}

interface WalletRpcError {
  code?: number;
}

@Component({
  selector: 'app-donation',
  imports: [],
  templateUrl: './donation.html',
  styleUrl: './donation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Donation {
  readonly donationUrl = 'https://ko-fi.com/annyoneany';
  private static readonly AVALANCHE_CHAIN_ID = '0xa86a';
  private static readonly DONATION_WALLET = '0x881563D85b4f2fC874F57b24EeA94f1f4450734D';
  private static readonly WEI_PER_AVAX = 1000000000000000000n;

  showAvaxPopup = false;
  avaxAmountInput = '0.5';

  openAvaxPopup(): void {
    this.avaxAmountInput = '0.5';
    this.showAvaxPopup = true;
  }

  closeAvaxPopup(): void {
    this.showAvaxPopup = false;
  }

  onAvaxAmountInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.avaxAmountInput = target.value;
  }

  async submitAvaxDonation(): Promise<void> {
    const amountHex = this.parseAvaxToWeiHex(this.avaxAmountInput);
    if (!amountHex) {
      window.alert('Please enter a valid AVAX amount greater than 0 (up to 18 decimals).');
      return;
    }

    await this.donateWithAvax(amountHex);
    this.closeAvaxPopup();
  }

  private async donateWithAvax(amountHex: string): Promise<void> {
    const provider = this.getEthereumProvider();
    if (!provider) {
      window.alert('No browser wallet detected. Please install a wallet extension to send AVAX.');
      return;
    }

    try {
      await this.ensureAvalancheNetwork(provider);

      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
      const from = accounts[0];
      if (!from) {
        window.alert('No connected account found. Connect your wallet once, then try Donate $Avax again.');
        return;
      }

      await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from,
            to: Donation.DONATION_WALLET,
            value: amountHex,
          },
        ],
      });
    } catch (error) {
      console.warn('Unable to create AVAX donation transaction', error);
    }
  }

  private getEthereumProvider(): EthereumProvider | null {
    const maybeProvider = (globalThis as Record<string, unknown>)['ethereum'];
    if (!maybeProvider || typeof maybeProvider !== 'object') {
      return null;
    }

    const provider = maybeProvider as Partial<EthereumProvider>;
    if (typeof provider.request !== 'function') {
      return null;
    }

    return provider as EthereumProvider;
  }

  private async ensureAvalancheNetwork(provider: EthereumProvider): Promise<void> {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: Donation.AVALANCHE_CHAIN_ID }],
      });
    } catch (error) {
      const rpcError = error as WalletRpcError;
      if (rpcError.code !== 4902) {
        throw error;
      }

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: Donation.AVALANCHE_CHAIN_ID,
            chainName: 'Avalanche C-Chain',
            nativeCurrency: {
              name: 'Avalanche',
              symbol: 'AVAX',
              decimals: 18,
            },
            rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://snowtrace.io/'],
          },
        ],
      });
    }
  }

  private parseAvaxToWeiHex(input: string): string | null {
    const normalized = input.trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }

    const [wholePartRaw, decimalPartRaw = ''] = normalized.split('.');
    if (decimalPartRaw.length > 18) {
      return null;
    }

    const wholePart = BigInt(wholePartRaw || '0');
    const decimalWei = BigInt((decimalPartRaw + '0'.repeat(18)).slice(0, 18));
    const wei = wholePart * Donation.WEI_PER_AVAX + decimalWei;

    if (wei <= 0n) {
      return null;
    }

    return `0x${wei.toString(16)}`;
  }
}
