import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdsService, RewardedAdOutcome } from './ads.service';
import { AuthService } from './auth.service';
import { PREMIUM_AD_UNLOCK_MS, PremiumService } from './premium.service';
import { WheelConfigurator } from './wheel-configurator.service';

describe('PremiumService (app: one ad per option, 1 minute to choose it)', () => {
  let adOutcome: RewardedAdOutcome;
  const wheelView = signal<'wheel' | 'wheel3d'>('wheel');

  function create(): PremiumService {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdsService,
          useValue: { isEnabled: true, showRewardedAd: () => Promise.resolve(adOutcome) },
        },
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        {
          provide: WheelConfigurator,
          useValue: {
            wheelView,
            pointerType: signal('drop'),
            winnerEffect: signal('confetti'),
          },
        },
      ],
    });
    return TestBed.inject(PremiumService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    adOutcome = 'rewarded';
    wheelView.set('wheel');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('unlocks only the option whose ad was watched', async () => {
    const premium = create();

    await premium.unlockWithRewardedAd('wheel3d');

    expect(premium.isUnlocked('wheel3d')).toBe(true);
    expect(premium.isUnlocked('chest')).toBe(false);
    expect(premium.isUnlocked('crown')).toBe(false);
    expect(premium.isUnlocked('crystal')).toBe(false);
  });

  it('asks for a new ad to choose the option again once its minute is up', async () => {
    const premium = create();
    await premium.unlockWithRewardedAd('chest');

    vi.advanceTimersByTime(PREMIUM_AD_UNLOCK_MS - 2000);
    expect(premium.isUnlocked('chest')).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(premium.isUnlocked('chest')).toBe(false);
    expect(premium.requestUnlock('chest')).toBe(false);
    expect(premium.adPromptFeature()).toBe('chest');
  });

  it('keeps an option in use after its minute is up: the timer only gates choosing it', async () => {
    const premium = create();
    await premium.unlockWithRewardedAd('wheel3d');
    wheelView.set('wheel3d');

    vi.advanceTimersByTime(PREMIUM_AD_UNLOCK_MS * 10);

    expect(premium.isUnlocked('wheel3d')).toBe(false);
    expect(premium.renderedWheelView()).toBe('wheel3d');
  });

  it('counts the time left down', async () => {
    const premium = create();
    await premium.unlockWithRewardedAd('crown');

    expect(premium.remainingLabel('crown')).toBe('1:00');
    vi.advanceTimersByTime(28_000);
    expect(premium.remainingLabel('crown')).toBe('0:32');
    expect(premium.remainingLabel('crystal')).toBe('');
  });

  it('keeps the option locked when the ad is skipped', async () => {
    const premium = create();
    adOutcome = 'skipped';

    await premium.unlockWithRewardedAd('crystal');

    expect(premium.isUnlocked('crystal')).toBe(false);
  });

  it('restores a running unlock after an app restart', async () => {
    const first = create();
    await first.unlockWithRewardedAd('crown');
    TestBed.resetTestingModule();

    vi.advanceTimersByTime(20_000);
    const second = create();

    expect(second.isUnlocked('crown')).toBe(true);
    expect(second.remainingLabel('crown')).toBe('0:40');
  });
});
