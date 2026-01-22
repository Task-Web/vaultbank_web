import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { checkAndSetCookieFromUrl, getUserIdCookie } from '../utils/cookies';

/**
 * CookieHandler - Checks URL for cookie parameter and sets it if present
 * This component must be rendered inside a Router context
 */
function CookieHandler() {
  const location = useLocation();

  useEffect(() => {
    // Check for cookie parameter in URL on mount and when location changes
    const wasCookieSet = checkAndSetCookieFromUrl(location.search);

    if (wasCookieSet) {
      console.log('Cookie was set from URL parameter');
    }

    // Log current cookie value
    const currentCookie = getUserIdCookie();
    console.log('Current user_id cookie:', currentCookie);
  }, [location.search]);

  // This component doesn't render anything
  return null;
}

export default CookieHandler;
