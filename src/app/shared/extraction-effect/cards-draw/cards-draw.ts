import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

type CardSuit = 'clubs' | 'spades' | 'hearts' | 'diamonds';

interface DrawCard {
  id: string;
  name: string;
  suit: CardSuit;
  symbol: string;
  x: number;
  y: number;
  rotateDeg: number;
}

const SUITS: ReadonlyArray<{ suit: CardSuit; symbol: string }> = [
  { suit: 'clubs', symbol: '♣' },
  { suit: 'spades', symbol: '♠' },
  { suit: 'hearts', symbol: '♥' },
  { suit: 'diamonds', symbol: '♦' },
];

@Component({
  selector: 'wl-cards-effect',
  imports: [],
  templateUrl: './cards-draw.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'w-full',
  },
})
export class CardsEffect {
  wheelConfigurator = inject(WheelConfigurator);

  cards = signal<DrawCard[]>([]);
  isAnimating = signal(false);
  revealedCardId = signal<string | null>(null);

  private revealTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private shuffleIntervalId: ReturnType<typeof setInterval> | null = null;

  private readonly syncNamesEffect = effect(() => {
    const names = this.wheelConfigurator.names();
    if (this.isAnimating()) {
      return;
    }

    this.cards.set(this.createDeck(names));
  });

  private readonly syncWinnerEffect = effect(() => {
    const winner = this.wheelConfigurator.winner();
    if (!winner && !this.isAnimating()) {
      this.revealedCardId.set(null);
    }
  });

  ngOnDestroy(): void {
    this.clearRevealTimeout();
    this.stopShuffleMotion();
  }

  startExtraction(): void {
    if (this.isAnimating() || this.wheelConfigurator.names().length === 0) {
      return;
    }

    const freshDeck = this.createDeck(this.wheelConfigurator.names());
    if (freshDeck.length === 0) {
      return;
    }

    this.clearRevealTimeout();
    this.stopShuffleMotion();
    this.cards.set(freshDeck);
    this.revealedCardId.set(null);
    this.isAnimating.set(true);
    this.startShuffleMotion();

    this.wheelConfigurator.winner.set(null);
    this.wheelConfigurator.isSpinning.set(true);

    this.revealTimeoutId = setTimeout(() => {
      this.revealTimeoutId = null;
      this.stopShuffleMotion();
      const deck = this.cards();
      if (!deck.length) {
        this.isAnimating.set(false);
        this.wheelConfigurator.isSpinning.set(false);
        return;
      }

      const winnerIndex = Math.floor(Math.random() * deck.length);
      const winner = deck[winnerIndex];
      this.revealedCardId.set(winner.id);
      this.isAnimating.set(false);
      this.wheelConfigurator.winner.set(winner.name);
      this.wheelConfigurator.isSpinning.set(false);
    }, 2600);
  }

  private createDeck(names: string[]): DrawCard[] {
    const shuffledNames = [...names].sort(() => Math.random() - 0.5);

    return shuffledNames.map((name, index) => {
      const suitEntry = SUITS[index % SUITS.length];
      return {
        id: `${index}-${name}`,
        name,
        suit: suitEntry.suit,
        symbol: suitEntry.symbol,
        x: Math.round((Math.random() - 0.5) * 70),
        y: Math.round((Math.random() - 0.5) * 30),
        rotateDeg: Math.round((Math.random() - 0.5) * 26),
      };
    });
  }

  cardTransform(card: DrawCard): string {
    const winnerId = this.revealedCardId();
    if (winnerId === card.id) {
      return 'translate(-50%, -50%) scale(1.18) rotate(0deg)';
    }

    return `translate(calc(-50% + ${card.x}px), calc(-50% + ${card.y}px)) rotate(${card.rotateDeg}deg)`;
  }

  private startShuffleMotion(): void {
    this.stopShuffleMotion();
    this.shuffleIntervalId = setInterval(() => {
      this.cards.update((deck) =>
        deck.map((card) => ({
          ...card,
          x: Math.round((Math.random() - 0.5) * 420),
          y: Math.round((Math.random() - 0.5) * 250),
          rotateDeg: Math.round((Math.random() - 0.5) * 130),
        }))
      );
    }, 150);
  }

  private stopShuffleMotion(): void {
    if (this.shuffleIntervalId) {
      clearInterval(this.shuffleIntervalId);
      this.shuffleIntervalId = null;
    }

    this.cards.update((deck) =>
      deck.map((card) => ({
        ...card,
        x: Math.round((Math.random() - 0.5) * 70),
        y: Math.round((Math.random() - 0.5) * 30),
        rotateDeg: Math.round((Math.random() - 0.5) * 26),
      }))
    );
  }

  private clearRevealTimeout(): void {
    if (!this.revealTimeoutId) {
      return;
    }

    clearTimeout(this.revealTimeoutId);
    this.revealTimeoutId = null;
  }
}
