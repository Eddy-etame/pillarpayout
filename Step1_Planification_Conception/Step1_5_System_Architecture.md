# PillarPayout System Architecture Diagram

## Components
- **Frontend**: React.js application with HTML5 Canvas for tower animation.
- **Backend**: Node.js with Express framework handling API requests and game logic.
- **Database**:
  - PostgreSQL for persistent data storage (users, bets, rounds, community goals, chat messages).
  - Redis for real-time game state and active bets.
- **WebSocket Server**: Real-time communication for game updates, player actions, and chat.
- **Payment Gateway**: Integration with Stripe for deposits and withdrawals.
- **Admin Panel**: Web interface for user management, game settings, and logs.

## Data Flow
1. Client sends API requests or WebSocket messages.
2. Backend processes requests, updates Redis and PostgreSQL as needed.
3. Backend broadcasts game state updates via WebSocket to clients.
4. Clients update UI based on received data.

## Infrastructure
- Hosted on AWS EC2 instances behind load balancers.
- Redis cluster for high availability.
- PostgreSQL with read replicas for scaling reads.
- Cloudflare for CDN and DDoS protection.

---
