import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../apiClient';

const StateContext = createContext();

const byId = (items = []) => new Map(items.map((item) => [item.id, item]));

const findAdded = (previous = [], next = []) => {
  const previousIds = new Set(previous.map((item) => item.id));
  return next.find((item) => !previousIds.has(item.id));
};

const writableProfile = (profile = {}) => ({
  first_name: profile.first_name,
  last_name: profile.last_name,
  email: profile.email,
  phone: profile.phone,
  address: profile.address,
  communication_preferences: profile.communication_preferences,
});

const writablePayee = (payee = {}) => ({
  name: payee.name,
  account_number: payee.account_number,
  address: payee.address,
  ...(payee.nickname ? { nickname: payee.nickname } : {}),
});

const findDebitedAccount = (previous = [], next = [], amount) => {
  const nextById = byId(next);
  return previous.find((account) => {
    const updated = nextById.get(account.id);
    return updated && Math.abs((account.current_balance - updated.current_balance) - amount) < 0.01;
  });
};

export const useStateContext = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useStateContext must be used within a StateProvider');
  }
  return context;
};

export const StateProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshState = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDashboard();
      const next = { data: response.data || {} };
      setState(next);
      return next;
    } catch (err) {
      setError(err.message || 'Failed to load state');
      console.error('Error loading state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyVaultbankChange = async (payload) => {
    try {
      const changes = payload?.data || payload;
      const current = state?.data || {};
      const actions = [];

      if (changes.user_profile) {
        actions.push(api.updateProfile(writableProfile(changes.user_profile)));
      }

      if (changes.credit_cards) {
        const previousCards = byId(current.credit_cards || []);
        changes.credit_cards.forEach((card) => {
          const previous = previousCards.get(card.id);
          if (!previous) return;
          if (previous.card_frozen !== card.card_frozen) {
            actions.push(api.setCardFrozen(card.id, card.card_frozen));
          }
          const paymentAmount = Number(previous.current_balance) - Number(card.current_balance);
          if (paymentAmount > 0.001) {
            const source = findDebitedAccount(current.accounts, changes.accounts, paymentAmount);
            if (!source) throw new Error('Unable to identify the card payment source account');
            actions.push(api.payCard(card.id, { account_id: source.id, amount: paymentAmount }));
          }
        });
      }

      if (changes.transfers) {
        const previousTransfers = current.transfers || { history: [], scheduled: [] };
        const nextTransfers = changes.transfers;
        const added = findAdded(previousTransfers.history, nextTransfers.history)
          || findAdded(previousTransfers.scheduled, nextTransfers.scheduled);
        if (added) {
          actions.push(api.executeTransfer({
            from_account_id: added.from_account_id,
            to_account_id: added.to_account_id || null,
            amount: added.amount,
            transfer_type: added.type,
            frequency: added.frequency || 'once',
            scheduled_date: added.status === 'pending' ? added.date : null,
            memo: added.memo || null,
            external_account_name: added.external_account?.name || null,
            external_account_number: added.external_account?.account_number || null,
            external_routing_number: added.external_account?.routing_number || null,
            external_account_type: added.external_account?.account_type || 'checking',
          }));
        }
        const nextScheduledIds = new Set((nextTransfers.scheduled || []).map((item) => item.id));
        (previousTransfers.scheduled || []).forEach((item) => {
          if (!nextScheduledIds.has(item.id)) actions.push(api.cancelTransfer(item.id));
        });
      }

      if (changes.bill_pay) {
        const previousBillPay = current.bill_pay || { payees: [], payment_history: [], scheduled_payments: [] };
        const nextBillPay = changes.bill_pay;
        const previousPayees = byId(previousBillPay.payees);
        const nextPayees = byId(nextBillPay.payees || previousBillPay.payees);
        nextPayees.forEach((payee, payeeId) => {
          const previous = previousPayees.get(payeeId);
          if (!previous) actions.push(api.createPayee(writablePayee(payee)));
          else if (JSON.stringify(previous) !== JSON.stringify(payee)) {
            actions.push(api.updatePayee(payeeId, writablePayee(payee)));
          }
        });
        previousPayees.forEach((_payee, payeeId) => {
          if (!nextPayees.has(payeeId)) actions.push(api.deletePayee(payeeId));
        });

        const addedPayment = findAdded(
          previousBillPay.payment_history,
          nextBillPay.payment_history || previousBillPay.payment_history
        ) || findAdded(
          previousBillPay.scheduled_payments,
          nextBillPay.scheduled_payments || previousBillPay.scheduled_payments
        );
        if (addedPayment) {
          actions.push(api.makePayment({
            from_account_id: addedPayment.from_account_id,
            amount: addedPayment.amount,
            payment_type: 'bill',
            payee_id: addedPayment.payee_id,
            scheduled_date: addedPayment.status === 'active'
              ? (addedPayment.next_date || addedPayment.date)
              : null,
            frequency: addedPayment.frequency || 'once',
            memo: addedPayment.memo || null,
          }));
        }
        const nextScheduledIds = new Set(
          (nextBillPay.scheduled_payments || previousBillPay.scheduled_payments).map((item) => item.id)
        );
        previousBillPay.scheduled_payments.forEach((item) => {
          if (!nextScheduledIds.has(item.id)) actions.push(api.cancelPayment(item.id));
        });
      }

      if (changes.investments) {
        const accountPairs = [
          ['brokerage', current.investments?.brokerage, changes.investments.brokerage],
          ...((changes.investments.retirement || []).map((account) => [
            account.account_type,
            (current.investments?.retirement || []).find((item) => item.account_type === account.account_type),
            account,
          ])),
        ];
        accountPairs.forEach(([accountType, previous, next]) => {
          if (!previous || !next) return;
          const trade = findAdded(previous.trades, next.trades);
          if (trade) {
            actions.push(api.executeTrade(accountType, {
              symbol: trade.symbol,
              trade_type: trade.type,
              quantity: trade.quantity,
              price: trade.price,
            }));
          }
        });
      }

      if (changes.loans) {
        const newLoan = findAdded(current.loans, changes.loans);
        if (newLoan) {
          actions.push(api.applyForLoan({
            loan_type: newLoan.type,
            amount: newLoan.original_amount,
            term_months: Math.max(12, newLoan.payment_schedule?.length || 60),
          }));
        }
        const previousLoans = byId(current.loans || []);
        changes.loans.forEach((loan) => {
          const previous = previousLoans.get(loan.id);
          if (!previous) return;
          const paymentAmount = Number(previous.current_balance) - Number(loan.current_balance);
          if (paymentAmount > 0.001) {
            const source = findDebitedAccount(current.accounts, changes.accounts, paymentAmount);
            if (!source) throw new Error('Unable to identify the loan payment source account');
            actions.push(api.payLoan(loan.id, { account_id: source.id, amount: paymentAmount }));
          }
        });
      }

      if (changes.mobile_deposits) {
        const deposit = findAdded(current.mobile_deposits || [], changes.mobile_deposits);
        if (deposit) {
          actions.push(api.createMobileDeposit({
            account_id: deposit.account_id,
            amount: deposit.amount,
            front_image: deposit.front_image,
            back_image: deposit.back_image,
          }));
        }
      }

      if (actions.length === 0) {
        throw new Error('Unsupported VaultBank state change');
      }
      await Promise.all(actions);
      return await refreshState();
    } catch (err) {
      setError(err.message || 'Failed to update state');
      throw err;
    }
  };

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const value = {
    state,
    loading,
    error,
    refreshState,
    applyVaultbankChange,
  };

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
};
