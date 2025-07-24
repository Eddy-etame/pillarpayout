# PillarPayout API Documentation

## Authentication
### POST /auth/register
- Request Body: { username, email, password }
- Response: JWT token on success

## Bets
### POST /bets/place
- Request Body: { amount, round_id }
- Response: Bet confirmation with bet details

## Rounds
### GET /rounds/history
- Response: List of past round multipliers (last 10 rounds)

## Provably Fair Verification
### POST /verify/provably-fair
- Request Body: { server_seed, client_seed, nonce }
- Response: Calculated crash point for verification

---
