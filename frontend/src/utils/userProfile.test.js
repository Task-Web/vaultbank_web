import { describe, expect, it } from 'vitest';
import { getUserDisplayName } from './userProfile';

describe('getUserDisplayName', () => {
  it('uses both names from the user profile', () => {
    expect(getUserDisplayName({ first_name: 'Jane', last_name: 'Smith' })).toBe(
      'Jane Smith'
    );
  });

  it('supports existing states with only one name field', () => {
    expect(getUserDisplayName({ first_name: 'Jane' })).toBe('Jane');
    expect(getUserDisplayName({ last_name: 'Smith' })).toBe('Smith');
  });

  it('uses a neutral fallback when the profile or names are missing', () => {
    expect(getUserDisplayName()).toBe('Valued Customer');
    expect(getUserDisplayName({ first_name: ' ', last_name: null })).toBe(
      'Valued Customer'
    );
  });
});
