import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../apiClient';
import { StateProvider, useStateContext } from './StateContext';

vi.mock('../apiClient', () => ({
  api: {
    getDashboard: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const UpdateProbe = () => {
  const { applyVaultbankChange } = useStateContext();

  return (
    <button onClick={() => applyVaultbankChange({ user_profile: { first_name: 'Ada' } })}>
      Update profile
    </button>
  );
};

describe('StateContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDashboard.mockResolvedValue({ data: { user_profile: {} } });
    api.updateProfile.mockResolvedValue({ data: { user_profile: { first_name: 'Ada' } } });
  });

  it('routes profile changes through the profile API', async () => {
    render(
      <StateProvider>
        <UpdateProbe />
      </StateProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update profile' }));

    await waitFor(() =>
      expect(api.updateProfile).toHaveBeenCalledWith({
        first_name: 'Ada',
        last_name: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        communication_preferences: undefined,
      })
    );
  });
});
