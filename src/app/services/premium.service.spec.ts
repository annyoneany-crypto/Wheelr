import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { NativePlatformService } from './native-platform.service';
import { PremiumService } from './premium.service';
import { WheelConfigurator } from './wheel-configurator.service';

const wheelView = signal<'wheel' | 'wheel3d' | 'pumpkin'>('pumpkin');
const loggedIn = signal(false);

function create(isNative: boolean): PremiumService {
  TestBed.configureTestingModule({
    providers: [
      { provide: NativePlatformService, useValue: { isNative } },
      { provide: AuthService, useValue: { isLoggedIn: loggedIn } },
      {
        provide: WheelConfigurator,
        useValue: { wheelView, pointerType: signal('drop'), winnerEffect: signal('confetti') },
      },
    ],
  });
  return TestBed.inject(PremiumService);
}

afterEach(() => TestBed.resetTestingModule());

describe('PremiumService (app: everything is free)', () => {
  it('unlocks every option without signing in', () => {
    loggedIn.set(false);
    const premium = create(true);

    expect(premium.isUnlocked('wheel3d')).toBe(true);
    expect(premium.isUnlocked('crystal')).toBe(true);
    expect(premium.requestUnlock('chest')).toBe(true);
    expect(premium.renderedWheelView()).toBe('pumpkin');
  });
});

describe('PremiumService (web: signing in unlocks everything)', () => {
  it('shows the classic wheel for a stored pumpkin while signed out, without rewriting it', () => {
    loggedIn.set(false);
    const premium = create(false);

    expect(premium.renderedWheelView()).toBe('wheel');
    expect(wheelView()).toBe('pumpkin');

    loggedIn.set(true);
    expect(premium.renderedWheelView()).toBe('pumpkin');
    expect(premium.isUnlocked('pumpkin')).toBe(true);
  });

  it('asks for a login when a locked option is chosen', () => {
    loggedIn.set(false);
    const premium = create(false);

    expect(premium.requestUnlock('crown')).toBe(false);
    expect(premium.loginRequestToken()).toBe(1);
  });
});
