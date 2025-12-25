// Token management utilities
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  // Check sessionStorage first (for pending ACC users), then localStorage
  return sessionStorage.getItem('auth_token') || 
         sessionStorage.getItem('token') || 
         localStorage.getItem('auth_token') || 
         localStorage.getItem('token');
};
