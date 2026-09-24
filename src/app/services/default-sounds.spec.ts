import { easeCubicBezier } from './default-sounds';

describe('easeCubicBezier', () => {
  const spinEasing: [number, number, number, number] = [0.15, 0, 0.15, 1];

  it('pins the endpoints', () => {
    expect(easeCubicBezier(0, spinEasing)).toBe(0);
    expect(easeCubicBezier(1, spinEasing)).toBe(1);
  });

  it('is the identity for a linear curve', () => {
    const linear: [number, number, number, number] = [1 / 3, 1 / 3, 2 / 3, 2 / 3];
    for (const t of [0.1, 0.25, 0.5, 0.9]) {
      expect(easeCubicBezier(t, linear)).toBeCloseTo(t, 4);
    }
  });

  it('never goes backwards, so no tick is scheduled twice', () => {
    let previous = 0;
    for (let t = 0.01; t <= 1; t += 0.01) {
      const value = easeCubicBezier(t, spinEasing);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('decelerates: the wheel covers far more ground early than late', () => {
    const firstTenth = easeCubicBezier(0.1, spinEasing);
    const lastTenth = 1 - easeCubicBezier(0.9, spinEasing);
    expect(firstTenth).toBeGreaterThan(lastTenth * 5);
  });
});
