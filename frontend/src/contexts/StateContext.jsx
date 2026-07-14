import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../apiClient';
import { checkAndSetCookieFromUrl, getUserIdCookie } from '../utils/cookies';

const StateContext = createContext();

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
      const response = await api.getState();
      // API returns {user_id, state: {meta, data, note}}
      // We want to store just the state part
      setState(response.state || response);

      // Log user_id for debugging
      if (response.user_id) {
        console.log('Current user_id:', response.user_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load state');
      console.error('Error loading state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateState = async (payload, fallbackNote) => {
    try {
      // Handle both formats: updateState({ data, note }) and updateState(data, note)
      const data = payload?.data || payload;
      const note = payload?.note ?? fallbackNote;
      const response = await api.patchState(data, note);
      setState(response.state || response);
      return response.state || response;
    } catch (err) {
      setError(err.message || 'Failed to update state');
      throw err;
    }
  };

  const replaceState = async (payload) => {
    try {
      // Handle both formats: replaceState({ data, note }) and replaceState(data, note)
      const data = payload?.data || payload;
      const note = payload?.note;
      const response = await api.replaceState(data, note);
      setState(response.state || response);
      return response.state || response;
    } catch (err) {
      setError(err.message || 'Failed to replace state');
      throw err;
    }
  };

  useEffect(() => {
    // Log current cookie value on load
    const currentCookie = getUserIdCookie();
    console.log('Current user_id cookie:', currentCookie);

    // Load state normally
    refreshState();
  }, [refreshState]);

  const value = {
    state,
    loading,
    error,
    refreshState,
    updateState,
    replaceState,
  };

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
};
