import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FireEffect } from './fire-effect';

describe('FireEffect', () => {
  let component: FireEffect;
  let fixture: ComponentFixture<FireEffect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FireEffect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FireEffect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
