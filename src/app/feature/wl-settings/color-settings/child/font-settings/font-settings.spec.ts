import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FontSettings } from './font-settings';

describe('FontSettings', () => {
  let component: FontSettings;
  let fixture: ComponentFixture<FontSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FontSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(FontSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selecting a preset font updates configurator signals', () => {
    const font = component.availableFonts[1];
    component.onSelect(font.family);
    expect(component.wheelConfigurator.fontFamily()).toBe(font.family);
    expect(component.wheelConfigurator.fontLink()).toBe(font.url);
  });
});
