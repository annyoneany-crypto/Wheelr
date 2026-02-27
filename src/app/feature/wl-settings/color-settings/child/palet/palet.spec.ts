import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Palet } from './palet';

describe('Palet', () => {
  let component: Palet;
  let fixture: ComponentFixture<Palet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Palet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Palet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
