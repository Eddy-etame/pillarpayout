# PillarPayout Risk Register

| Risk                  | Likelihood | Impact | Mitigation Strategy                                      | Contingency Plan                          |
|-----------------------|------------|--------|----------------------------------------------------------|-------------------------------------------|
| Complex real-time animations cause lag | Medium     | High   | Optimize Canvas with PixiJS, test on low-end devices     | Allocate extra sprint for optimization    |
| High concurrent users overload server | High       | High   | Use load balancers, Redis clustering                      | Scale infrastructure, add more instances  |
| Security breaches (DDoS, SQL injection) | Medium     | High   | Cloudflare protection, input validation, prepared statements | Incident response team, rollback plan     |
| Feature creep or developer availability | Medium     | Medium | Strict backlog prioritization, hire freelancers if needed | Adjust scope, hire temporary resources    |
| Low user engagement    | Medium     | Medium | Beta testing, marketing campaigns                          | Increase marketing budget, user feedback  |

---
