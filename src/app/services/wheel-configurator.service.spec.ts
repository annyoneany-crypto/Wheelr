import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { WheelConfigurator } from './wheel-configurator.service';

describe('WheelConfigurator (countdown)', () => {
  let service: WheelConfigurator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WheelConfigurator);
  });

  it('should be created with sensible defaults', () => {
    expect(service).toBeTruthy();
    expect(service.countdownEnabled()).toBeFalse();
    expect(service.countdownStart()).toBe(3);
    expect(service.currentCountdown()).toBeNull();
  });

  it('runCountdown updates currentCountdown and resolves', fakeAsync(() => {
    // access private method via any cast
    const runner = (service as any).runCountdown.bind(service) as () => Promise<void>;
    service.countdownStart.set(3);

    let finished = false;
    runner().then(() => (finished = true));

    // initial value should be start
    expect(service.currentCountdown()).toBe(3);

    tick(1000);
    expect(service.currentCountdown()).toBe(2);

    tick(1000);
    expect(service.currentCountdown()).toBe(1);

    tick(1000);
    expect(service.currentCountdown()).toBeNull();
    expect(finished).toBeTrue();
  }));

  it('spinWheel runs countdown even when no audio is configured', fakeAsync(() => {
    service.countdownEnabled.set(true);
    service.countdownStart.set(2);
    service.countdownAudio.set(''); // ensure no audio

    const spy = spyOn<any>(service, 'performSpin');

    service.spinWheel();
    expect(service.countdownInProgress()).toBeTrue();

    tick(2100);
    expect(spy).toHaveBeenCalled();
    expect(service.countdownInProgress()).toBeFalse();
    expect(service.currentCountdown()).toBeNull();
  }));

  it('spinWheel immediately spins when countdown is disabled', fakeAsync(() => {
    service.countdownEnabled.set(false);
    const spy = spyOn<any>(service, 'performSpin');
    service.spinWheel();
    expect(spy).toHaveBeenCalled();
  }));
});
