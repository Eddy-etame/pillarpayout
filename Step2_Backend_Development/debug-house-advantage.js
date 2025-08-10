const gameEngine = require('./services/gameEngine');

console.log('🧪 Debugging House Advantage Calculation\n');

// Test the calculation with different bet amounts
const testBets = [1.00, 2.00, 10.00, 50.00];

console.log('Testing calculateHouseAdvantage:');
testBets.forEach(bet => {
  const probability = gameEngine.calculateHouseAdvantage(bet);
  console.log(`Bet: $${bet} -> Probability: ${probability.toFixed(4)}`);
});

console.log('\nConstants:');
console.log(`MEDIUM_BET_AMOUNT: ${gameEngine.MEDIUM_BET_AMOUNT}`);
console.log(`BASE_CRASH_PROBABILITY: ${gameEngine.BASE_CRASH_PROBABILITY}`);
console.log(`HOUSE_ADVANTAGE_FACTOR: ${gameEngine.HOUSE_ADVANTAGE_FACTOR}`);
console.log(`MAX_CRASH_PROBABILITY: ${gameEngine.MAX_CRASH_PROBABILITY}`);
console.log(`MIN_CRASH_PROBABILITY: ${gameEngine.MIN_CRASH_PROBABILITY}`);

console.log('\nTesting crash point calculation:');
gameEngine.serverSeed = 'test-seed-1';
gameEngine.clientSeed = 'test-client-1';
gameEngine.nonce = 123456789;

// Test with no bets
gameEngine.activeBets.clear();
const crashPoint1 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`No bets -> Crash point: ${crashPoint1}`);

// Test with different bet amounts
gameEngine.activeBets.set(1, { amount: 1.00 });
const crashPoint2 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`Bet $1.00 -> Crash point: ${crashPoint2}`);

gameEngine.activeBets.set(2, { amount: 10.00 });
const crashPoint3 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`Bet $10.00 -> Crash point: ${crashPoint3}`); 