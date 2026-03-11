# Auth API

- [Overview](#overview)
- [Endpoints](#endpoints)
- [Request / Response](#request--response)
- [Error Responses](#error-responses)
- [Examples](#examples)

## Overview

All auth routes are mounted under `/api/auth`. Login and register use **HttpOnly cookie** for `refreshToken`; the response body contains `accessToken` and `user`. Use `Authorization: Bearer <accessToken>` for protected routes.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login (sets refreshToken cookie) |
| POST | `/api/auth/refresh` | ❌ | Refresh access token (uses cookie) |
| POST | `/api/auth/logout` | ❌ | Logout (clears cookie) |
| POST | `/api/auth/logout-all` | ❌ | Logout all sessions |
| GET | `/api/auth/me` | ❌ | Get current user (optional cookie/token) |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/auth/sessions` | ✅ | List sessions |
| DELETE | `/api/auth/sessions/:tokenId` | ✅ | Revoke one session |
| POST | `/api/auth/2fa/setup` | ✅ | Start 2FA setup |
| POST | `/api/auth/2fa/verify` | ✅ | Verify and enable 2FA |
| POST | `/api/auth/2fa/authenticate` | ❌ | Submit 2FA code after login |
| POST | `/api/auth/2fa/disable` | ✅ | Disable 2FA |
| POST | `/api/auth/verify-email/send` | ✅ | Send verification email |
| POST | `/api/auth/verify-email/confirm` | ✅ | Confirm email with code |
| GET | `/api/auth/google/url` | ❌ | Get Google OAuth URL |
| GET | `/api/auth/google/callback` | ❌ | OAuth callback |

## Request / Response

### POST /api/auth/register

**Body:** `emailOrPhone`, `password`, `fullName` (optional), `referralCode` (optional).

**Success (201):**

```json
{
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "phone": null,
      "fullName": "User Name",
      "username": null,
      "plan": "free",
      "onboardingCompleted": false,
      "isFirstLogin": true
    }
  }
}
```

**Cookie:** `refreshToken` set (HttpOnly, SameSite=strict).

---

### POST /api/auth/login

**Body:** `emailOrPhone`, `password`.

**Success (200):**

```json
{
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "plan": "free",
      "fullName": "User Name"
    }
  }
}
```

If 2FA is enabled, response is:

```json
{
  "data": {
    "requires2FA": true,
    "tempToken": "..."
  }
}
```

**Cookie:** `refreshToken` set on success.

---

### GET /api/auth/me

Returns current user when cookie or `Authorization: Bearer <accessToken>` is present. No auth required (public endpoint).

**Success (200):**

```json
{
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "plan": "free",
      "fullName": "User Name"
    }
  }
}
```

## Error Responses

| Status | Error (body) | Description |
|--------|--------------|-------------|
| 400 | `VALIDATION_ERROR` / message | Invalid email format or validation failed |
| 401 | `unauthorized` | Wrong password or not authenticated |
| 401 | `account_not_found` | No user with this email/phone |
| 423 | `account_locked` | Too many failed attempts; account locked 30 min |
| 400 | `already_registered` | Email/phone/username already in use |

## Examples

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","password":"SecurePass123","fullName":"Test User"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","password":"SecurePass123"}' \
  -c cookies.txt
```

### Get current user (with cookie)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### Get current user (with Bearer token)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJ..."
```

### Refresh token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt
```
