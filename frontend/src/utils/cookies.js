/**
 * Cookie utility functions for managing user_id cookie
 */

const COOKIE_NAME = 'user_id';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Get the user_id cookie value
 * @returns {string|null} The cookie value or null if not set
 */
export function getUserIdCookie() {
  const cookies = document.cookie.split(';');
  const cookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  return cookie ? cookie.split('=')[1].trim() : null;
}

/**
 * Set the user_id cookie
 * @param {string} value - The cookie value to set
 */
export function setUserIdCookie(value) {
  if (!value) {
    console.warn('Cannot set empty cookie value');
    return;
  }

  // Set cookie with SameSite=Lax for security
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  console.log(`Set ${COOKIE_NAME} cookie:`, value);
}

/**
 * Delete the user_id cookie
 */
export function deleteUserIdCookie() {
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
}

/**
 * Check for cookie parameter in URL and set it if present
 * This allows switching between different user states via URL
 * @param {string} search - The URL search string (window.location.search)
 * @returns {boolean} True if cookie was set from URL parameter
 */
export function checkAndSetCookieFromUrl(search) {
  const params = new URLSearchParams(search);
  const cookieParam = params.get('cookie');

  if (cookieParam) {
    console.log('Found cookie parameter in URL:', cookieParam);
    setUserIdCookie(cookieParam);

    // Remove the cookie parameter from URL to keep it clean
    const url = new URL(window.location.href);
    url.searchParams.delete('cookie');
    window.history.replaceState({}, '', url.toString());

    return true;
  }

  return false;
}
