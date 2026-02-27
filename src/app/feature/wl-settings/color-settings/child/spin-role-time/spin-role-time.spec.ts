import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpinRoleTime } from './spin-role-time';
import { WheelConfigurator } from '../../../../../services/wheel-configurator.service';

describe('SpinRoleTime', () => {
  let component: SpinRoleTime;
  let fixture: ComponentFixture<SpinRoleTime>;
  let config: WheelConfigurator;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpinRoleTime],
    }).compileComponents();

    fixture = TestBed.createComponent(SpinRoleTime);
    component = fixture.componentInstance;
    config = component.wheelConfigurator;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('binds seconds value to configurator.duration', () => {
    // default should equal whatever service returns (the default is 3000ms -> 3s)
    expect(component.durationSec).toBe(3);

    // updating property updates service
    component.durationSec = 5;
    expect(config.spinDurationMs()).toBe(5000);

    // service change reflects in getter
    config.spinDurationMs.set(12000);
    expect(component.durationSec).toBe(12);
  });
});
