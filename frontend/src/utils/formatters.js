import React from 'react';

/**
 * Format currency values with proper formatting
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format currency values with ISO currency code.
 * @param {number} amount - The amount to format
 * @param {string} currency - ISO currency code
 * @returns {string} Formatted currency string with code
 */
export const formatCurrencyWithCode = (amount, currency = 'USD') => {
  const safeAmount = amount === null || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};

/**
 * Format a time string (HH:MM:SS).
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

/**
 * Format date to short string (MM/DD/YYYY)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatShortDate = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Mask account number showing only last 4 digits
 * @param {string} accountNumber - Full account number
 * @returns {string} Masked account number
 */
export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return '****';

  const lastFour = accountNumber.slice(-4);
  return `****${lastFour}`;
};

const accountTypeIconProps = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

const createSvg = (children, props = {}) =>
  React.createElement('svg', { ...accountTypeIconProps, ...props }, ...children);

const CheckingIcon = (props) =>
  createSvg(
    [
      React.createElement('path', { d: 'M4 10L12 5L20 10' }),
      React.createElement('path', { d: 'M5 10V18' }),
      React.createElement('path', { d: 'M9 10V18' }),
      React.createElement('path', { d: 'M15 10V18' }),
      React.createElement('path', { d: 'M19 10V18' }),
      React.createElement('path', { d: 'M3 18H21' }),
    ],
    props
  );

const SavingsIcon = (props) =>
  createSvg(
    [
      React.createElement('line', { x1: '12', y1: '2', x2: '12', y2: '22' }),
      React.createElement('path', { d: 'M17 6H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6' }),
    ],
    props
  );

const CdIcon = (props) =>
  createSvg(
    [
      React.createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      React.createElement('polyline', { points: '14 2 14 8 20 8' }),
      React.createElement('line', { x1: '16', y1: '13', x2: '8', y2: '13' }),
      React.createElement('line', { x1: '16', y1: '17', x2: '8', y2: '17' }),
    ],
    props
  );

const MoneyMarketIcon = (props) =>
  createSvg(
    [
      React.createElement('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
      React.createElement('polyline', { points: '17 6 23 6 23 12' }),
    ],
    props
  );

const CreditCardIcon = (props) =>
  createSvg(
    [
      React.createElement('rect', { x: '2', y: '5', width: '20', height: '14', rx: '2', ry: '2' }),
      React.createElement('line', { x1: '2', y1: '10', x2: '22', y2: '10' }),
      React.createElement('line', { x1: '7', y1: '15', x2: '10', y2: '15' }),
    ],
    props
  );

/**
 * Get account type icon
 * @param {string} type - Account type (checking, savings, etc.)
 * @returns {JSX.Element} Account type icon
 */
export const getAccountTypeIcon = (type) => {
  const icons = {
    checking: CheckingIcon,
    savings: SavingsIcon,
    cd: CdIcon,
    money_market: MoneyMarketIcon,
    credit_card: CreditCardIcon,
  };
  const Icon = icons[type] || CheckingIcon;
  return React.createElement(Icon);
};
