import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sound } from './sound';

describe('Sound', () => {
  let component: Sound;
  let fixture: ComponentFixture<Sound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sound]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sound);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sound enabled state', () => {
    const config = component.wheelConfigurator;
    const initialState = config.soundEnabled();
    config.soundEnabled.set(!initialState);
    expect(config.soundEnabled()).toBe(!initialState);
  });

  it('should clear custom audio', () => {
    const config = component.wheelConfigurator;
    config.setCustomAudio('data:audio/mp3;base64,fake');
    expect(config.customAudio()).toBeTruthy();

    component.clearCustomAudio();
    expect(config.customAudio()).toBe('');
  });

  it('should set and clear winner audio', () => {
    const config = component.wheelConfigurator;
    config.setWinnerAudio('data:audio/mp3;base64,winner');
    expect(config.winnerAudio()).toBeTruthy();

    component.clearWinnerAudio();
    expect(config.winnerAudio()).toBe('');
  });
});
