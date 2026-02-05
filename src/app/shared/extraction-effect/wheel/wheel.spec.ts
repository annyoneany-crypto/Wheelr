import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Wheel } from './wheel';

describe('Wheel', () => {
  let component: Wheel;
  let fixture: ComponentFixture<Wheel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wheel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Wheel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
