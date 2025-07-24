# PillarPayout Database Schemas

## PostgreSQL Schema

### users
| Column         | Type          | Description                  |
|----------------|---------------|------------------------------|
| id             | SERIAL PRIMARY KEY | Unique user identifier       |
| username       | VARCHAR(50)   | User's display name          |
| email          | VARCHAR(100)  | User's email address         |
| password_hash  | VARCHAR(255)  | Hashed password              |
| balance        | NUMERIC(12,2) | User account balance         |
| created_at     | TIMESTAMP     | Account creation timestamp   |

### bets
| Column           | Type          | Description                      |
|------------------|---------------|---------------------------------|
| id               | SERIAL PRIMARY KEY | Unique bet identifier           |
| user_id          | INTEGER       | Foreign key to users             |
| round_id         | INTEGER       | Foreign key to rounds            |
| amount           | NUMERIC(12,2) | Bet amount                      |
| cashout_multiplier| NUMERIC(5,2)  | Multiplier at cashout           |
| timestamp        | TIMESTAMP     | Bet placement time              |

### rounds
| Column       | Type          | Description                      |
|--------------|---------------|---------------------------------|
| id           | SERIAL PRIMARY KEY | Unique round identifier         |
| crash_point  | NUMERIC(5,2)  | Multiplier at crash              |
| server_seed  | VARCHAR(64)   | Server seed for Provably Fair    |
| client_seed  | VARCHAR(64)   | Client seed                     |
| nonce        | INTEGER       | Nonce for hashing               |
| timestamp    | TIMESTAMP     | Round start time                |

### community_goals
| Column        | Type          | Description                      |
|---------------|---------------|---------------------------------|
| id            | SERIAL PRIMARY KEY | Unique goal identifier          |
| target_blocks | INTEGER       | Blocks needed to unlock reward  |
| current_blocks| INTEGER       | Blocks built so far             |
| reward        | VARCHAR(100)  | Description of reward           |
| status        | VARCHAR(20)   | Status (e.g., active, completed)|

### chat_messages
| Column     | Type          | Description                      |
|------------|---------------|---------------------------------|
| id         | SERIAL PRIMARY KEY | Unique message identifier       |
| user_id    | INTEGER       | Foreign key to users             |
| message    | TEXT          | Chat message content             |
| timestamp  | TIMESTAMP     | Message sent time                |

## Redis Key Structures

### game_state
- Hash containing:
  - round_id
  - multiplier
  - integrity
  - state (e.g., waiting, running, crashed)
  - active_players (list or set of user_ids)

### active_bets
- Hash mapping user_id to bet details:
  - amount
  - cashout_multiplier
  - timestamp

---
