/**
 * auth.service.ts — barrel re-export
 * Split into:
 *   auth.shared.ts          — shared constants, AuthContext type, toUserPayload
 *   auth.register.service.ts — register
 *   auth.login.service.ts    — login, changePassword
 *   auth.twofa.service.ts    — twoFaAuthenticate, twoFaSetup, twoFaVerify, twoFaDisable
 *   auth.tokens.service.ts   — refresh, logout, logoutAll, getSessions, revokeSession, getMe
 *   auth.google.service.ts   — getGoogleUrl, googleCallback
 */
export type { AuthContext } from './auth.shared.ts';
export { register } from './auth.register.service.ts';
export { login, changePassword } from './auth.login.service.ts';
export { twoFaAuthenticate, twoFaSetup, twoFaVerify, twoFaDisable } from './auth.twofa.service.ts';
export { refresh, logout, logoutAll, getSessions, revokeSession, getMe } from './auth.tokens.service.ts';
export { getGoogleUrl, googleCallback } from './auth.google.service.ts';
export { setupPin, removePin, loginWithPin } from './auth.pin.service.ts';
