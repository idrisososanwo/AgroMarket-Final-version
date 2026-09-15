# Auth Domain

## Responsibilities
- User registration, login, logout
- OTP generation and verification (SMS / Email for Nigerian context)
- Server-side session verification
- Password reset and recovery

## Rules & Boundaries
- All credential authentication flows must be processed server-side.
- Client components may only consume session status and public user profile data.
- Trusted roles must be assigned server-side.
