import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const buildResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const createDashboardPayload = (userProfile) => ({
  user_id: 'test-user',
  data: {
    accounts: [],
    credit_cards: [],
    loans: [],
    bill_pay: {
      payees: [],
      scheduled_payments: [],
      payment_history: [],
    },
    transfers: { history: [], scheduled: [] },
    user_profile: userProfile,
  },
});

describe('App', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async () =>
      buildResponse(
        createDashboardPayload({ first_name: 'Jane', last_name: 'Smith' })
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the profile name from state in the top navigation', async () => {
    render(<App />);

    expect(
      await screen.findByRole('button', { name: /Jane Smith/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Welcome back, Jane!' })
    ).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('uses a neutral fallback for a legacy state without a profile', async () => {
    globalThis.fetch.mockImplementationOnce(async () =>
      buildResponse(createDashboardPayload(undefined))
    );

    render(<App />);

    expect(
      await screen.findByRole('button', { name: /Valued Customer/ })
    ).toBeInTheDocument();
  });
});
