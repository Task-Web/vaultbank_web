import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../apiClient';
import { StateProvider, useStateContext } from './StateContext';

vi.mock('../apiClient', () => ({
  api: {
    getState: vi.fn(),
    patchState: vi.fn(),
    replaceState: vi.fn(),
  },
}));

const UpdateProbe = () => {
  const { updateState } = useStateContext();

  return (
    <button onClick={() => updateState({ enabled: true }, 'Updated from probe')}>
      Update state
    </button>
  );
};

describe('StateContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getState.mockResolvedValue({ state: { data: {}, note: null } });
    api.patchState.mockResolvedValue({
      state: { data: { enabled: true }, note: 'Updated from probe' },
    });
  });

  it('forwards the second updateState argument as the state note', async () => {
    render(
      <StateProvider>
        <UpdateProbe />
      </StateProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update state' }));

    await waitFor(() =>
      expect(api.patchState).toHaveBeenCalledWith(
        { enabled: true },
        'Updated from probe'
      )
    );
  });
});
