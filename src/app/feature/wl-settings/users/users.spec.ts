import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Users } from './users';

describe('Users', () => {
  let component: Users;
  let fixture: ComponentFixture<Users>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Users]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('addRepeated should append the given name multiple times', () => {
    component.newName.set('Alice');
    component.repeatCount.set(3);
    component.addRepeated();

    const names = component.wheelConfigurator.names();
    expect(names.length).toBe(3);
    expect(names).toEqual(['Alice', 'Alice', 'Alice']);
  });

  it('addRepeated ignores empty name and enforces minimum count', () => {
    component.newName.set('   ');
    component.repeatCount.set(5);
    component.addRepeated();
    expect(component.wheelConfigurator.names().length).toBe(0);

    component.newName.set('Bob');
    component.repeatCount.set(0);
    component.addRepeated();
    expect(component.wheelConfigurator.names()).toEqual(['Bob']);
  });
});
