# PillarPayout WebSocket Protocol

## Messages

### game_update
- Description: Sent by server to update clients on game state.
- Payload:
  ```json
  {
    "multiplier": 1.25,
    "integrity": 85,
    "state": "running",
    "special_block": "boost" // or null
  }
  ```

### player_action
- Description: Sent by client to server to indicate player actions.
- Payload:
  ```json
  {
    "user_id": 123,
    "action": "bet" | "cashout",
    "amount": 50,
    "multiplier": 1.5
  }
  ```

### chat_message
- Description: Sent by client to server and broadcast to all clients.
- Payload:
  ```json
  {
    "user_id": 123,
    "message": "Good luck everyone!",
    "timestamp": "2025-07-22T12:00:00Z"
  }
  ```

---
