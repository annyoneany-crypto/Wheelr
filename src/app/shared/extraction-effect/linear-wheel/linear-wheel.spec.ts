import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinearWheel } from './linear-wheel';

describe('LinearWheel', () => {
  let component: LinearWheel;
  let fixture: ComponentFixture<LinearWheel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinearWheel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinearWheel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
