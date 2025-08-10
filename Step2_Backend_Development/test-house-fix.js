const gameEngine = require('./services/gameEngine');

console.log('🧪 Testing House Advantage Fix\n');

// Test the calculation with different bet amounts
const testBets = [1.00, 2.00, 10.00, 50.00];

console.log('Testing calculateHouseAdvantage:');
testBets.forEach(bet => {
  const probability = gameEngine.calculateHouseAdvantage(bet);
  console.log(`Bet: $${bet} -> Probability: ${probability.toFixed(4)}`);
});

console.log('\nTesting crash point calculation with different seeds:');
gameEngine.activeBets.clear();

// Test 1: No bets
gameEngine.serverSeed = 'test-seed-no-bets';
gameEngine.clientSeed = 'test-client-no-bets';
gameEngine.nonce = 111111111;
const crashPoint1 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`No bets -> Crash point: ${crashPoint1}`);

// Test 2: Low bet
gameEngine.activeBets.set(1, { amount: 1.00 });
gameEngine.serverSeed = 'test-seed-low-bet';
gameEngine.clientSeed = 'test-client-low-bet';
gameEngine.nonce = 222222222;
const crashPoint2 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`Bet $1.00 -> Crash point: ${crashPoint2}`);

// Test 3: High bet
gameEngine.activeBets.set(2, { amount: 10.00 });
gameEngine.serverSeed = 'test-seed-high-bet';
gameEngine.clientSeed = 'test-client-high-bet';
gameEngine.nonce = 333333333;
const crashPoint3 = gameEngine.calculateCrashPointWithAdvantage();
console.log(`Bet $10.00 -> Crash point: ${crashPoint3}`);

console.log('\nVerification:');
console.log(`Crash points different: ${crashPoint1 !== crashPoint2 && crashPoint2 !== crashPoint3}`);
console.log(`Medium bet probability: ${gameEngine.calculateHouseAdvantage(2.00)}`);
console.log(`Expected base probability: ${gameEngine.BASE_CRASH_PROBABILITY}`); 