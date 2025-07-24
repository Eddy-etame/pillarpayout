# PillarPayout Functional Requirements Document

## Core Features

### Bet Placement
- **User Story**: As a player, I want to place one or two bets before a round starts so I can participate in the game.
- **Acceptance Criteria**:
  - Input field for bet amount.
  - Validation for minimum and maximum bets (e.g., $1–$1000).
  - 5-second countdown timer before round starts.

### Multiplier Progression
- **User Story**: As a player, I want to see the multiplier increase as the tower grows to gauge potential winnings.
- **Acceptance Criteria**:
  - Multiplier starts at 1.00x.
  - Increments by 0.05x every 100ms.
  - Displayed in real-time.

### Cash Out
- **User Story**: As a player, I want to cash out at any time to secure my winnings.
- **Acceptance Criteria**:
  - Cash-out button active during “running” state.
  - Calculates winnings as bet × current multiplier.

### Crash Mechanism
- **User Story**: As a player, I want the tower to collapse unpredictably to feel the risk.
- **Acceptance Criteria**:
  - Crash point determined by a Provably Fair algorithm.
  - Visually shown as tower collapse.

### Provably Fair
- **User Story**: As a player, I want to verify the fairness of each round.
- **Acceptance Criteria**:
  - Provide server seed, client seed, and nonce inputs.
  - Players can validate crash points via SHA-256 hashing.

### Round History
- **User Story**: As a player, I want to see past round multipliers to inform my strategy.
- **Acceptance Criteria**:
  - Display last 10 round multipliers in a scrollable list.

### Live Chat
- **User Story**: As a player, I want to chat with others to feel part of a community.
- **Acceptance Criteria**:
  - Real-time chat with message input, display, and moderation options.

### Auto-Play/Auto-Cashout
- **User Story**: As a player, I want to automate betting for convenience.
- **Acceptance Criteria**:
  - Options to set number of rounds, bet amount, and auto-cashout multiplier (e.g., 2.0x).

## Unique Features

### Structural Integrity Meter
- **User Story**: As a player, I want to see a meter showing the tower’s stability to assess risk.
- **Acceptance Criteria**:
  - Meter starts at 100%.
  - Decreases by 0–2% per block (randomized, tied to crash probability).
  - Displayed as a colored bar (green >50%, orange 20–50%, red <20%).

### Special Blocks
- **User Story**: As a player, I want special blocks to appear for extra rewards.
- **Acceptance Criteria**:
  - 5% chance per block for Boost (+0.5x multiplier), Stability (pauses integrity decrease for 3 blocks), or Bonus (+$5 if cashed out after block appears).

### Community Construction Goals
- **User Story**: As a player, I want to contribute to community goals for shared rewards.
- **Acceptance Criteria**:
  - Track total blocks built across all players.
  - Unlock rewards (e.g., 1% RTP boost) at milestones (e.g., 100,000 blocks weekly).

### Builder’s Insurance
- **User Story**: As a player, I want an optional side bet to reduce losses.
- **Acceptance Criteria**:
  - Pay 10% of main bet for insurance.
  - Receive 50% of bet back if crash occurs below 2.0x.

---
