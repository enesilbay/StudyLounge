import { advanceStreak } from './streak';

describe('advanceStreak', () => {
  it('continues the streak on the next day', () => {
    expect(advanceStreak(4, 1, 0)).toEqual({ streak: 5, freezesUsed: 0 });
  });

  it('spends one freeze per missed day', () => {
    expect(advanceStreak(4, 2, 1)).toEqual({ streak: 5, freezesUsed: 1 });
    expect(advanceStreak(4, 3, 2)).toEqual({ streak: 5, freezesUsed: 2 });
  });

  it('restarts without spending freezes when they are not enough', () => {
    expect(advanceStreak(4, 4, 2)).toEqual({ streak: 1, freezesUsed: 0 });
    expect(advanceStreak(4, 2, 0)).toEqual({ streak: 1, freezesUsed: 0 });
  });

  it('does not spend freezes when there is no streak to protect', () => {
    expect(advanceStreak(0, 2, 2)).toEqual({ streak: 1, freezesUsed: 0 });
  });
});
