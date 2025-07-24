# PillarPayout Provably Fair Specification

## Overview
The Provably Fair system ensures transparency and fairness in determining the crash point of each round.

## Algorithm Steps
1. **Server Seed Generation**: Before each round, the server generates a random 256-bit server seed.
2. **Client Seed Collection**: Players provide their client seeds.
3. **Nonce**: A nonce (incrementing number) is used to ensure uniqueness.
4. **Hashing**: Combine server seed, client seed, and nonce, then hash using SHA-256.
5. **Crash Point Calculation**: Convert the hash output to a numeric value and calculate the crash point as:
   ```
   crash_point = (hash % 10000) / 1000 + 1
   ```
6. **Publishing Seeds**: After the round, the server publishes the server seed and nonce for players to verify.

## Verification Process
- Players input the server seed, client seed, and nonce into the verification tool.
- The tool replicates the hashing and calculation to confirm the crash point.

---
