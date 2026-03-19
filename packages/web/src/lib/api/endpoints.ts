/** كل الـ API endpoints في مكان واحد */
export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
    twoFA: {
      setup: '/api/auth/2fa/setup',
      verify: '/api/auth/2fa/verify',
      disable: '/api/auth/2fa/disable',
      authenticate: '/api/auth/2fa/authenticate',
    },
  },
  user: {
    profile: '/api/user/profile',
    completion: '/api/profile/completion',
    sessions: '/api/auth/sessions',
    security: '/api/user/security',
    account: '/api/user/account',
  },
  stocks: '/api/stocks',
  market: '/api/market',
  portfolio: '/api/portfolio',
  goals: '/api/goals',
  notifications: '/api/notifications',
  achievements: '/api/user/achievements',
  referrals: '/api/referrals',
  subscription: '/api/subscription',
} as const;
