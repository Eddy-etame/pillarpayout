import { create } from 'zustand';

interface GameState {
  // Game state
  currentRound: number;
  isGameActive: boolean;
  gameState: 'waiting' | 'running' | 'crashed' | 'results';
  roundTime: number;
  multiplier: number;
  integrity: number;
  crashPoint: number;
  
  // Player state
  playerBalance: number;
  currentBet: number;
  hasPlacedBet: boolean;
  userId: string | null;
  username: string | null;
  
  // Real-time data
  connectedPlayers: number;
  liveBets: LiveBet[];
  roundHistory: RoundHistory[];
  gameHistory: any[];
  
  // Insurance
  insuranceOptions: InsuranceOption[] | null;
  selectedInsurance: InsuranceType | null;
  
  // Chat
  chatMessages: ChatMessage[];
  activeUsers: ActiveUser[];
  
  // Statistics (for profile only)
  playerStats: PlayerStats | null;
}

interface LiveBet {
  userId: string;
  username: string;
  amount: number;
  multiplier: number;
  timestamp: Date;
}

interface RoundHistory {
  roundId: number;
  multiplier: number;
  crashed: boolean;
  timestamp: Date;
  crashPoint: number;
}

interface InsuranceOption {
  type: 'basic' | 'premium' | 'elite';
  premium: number;
  premiumRate: number;
  coverageRate: number;
  coverageAmount: number;
  totalCost: number;
  valueForMoney: number;
}

type InsuranceType = 'basic' | 'premium' | 'elite';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'admin';
}

interface ActiveUser {
  username: string;
  lastActivity: Date;
}

interface PlayerStats {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  wins: number;
  losses: number;
  biggestWin: number;
  biggestLoss: number;
  highestMultiplier: number;
  averageBet: number;
  winRate: number;
  profitLoss: number;
}

interface GameActions {
  // Game state actions
  setCurrentRound: (round: number) => void;
  setGameActive: (active: boolean) => void;
  setGameState: (state: GameState['gameState']) => void;
  setRoundTime: (time: number) => void;
  setMultiplier: (multiplier: number) => void;
  setIntegrity: (integrity: number) => void;
  setCrashPoint: (crashPoint: number) => void;
  
  // Player actions
  setPlayerBalance: (balance: number) => void;
  setCurrentBet: (bet: number) => void;
  setHasPlacedBet: (placed: boolean) => void;
  setUserId: (userId: string) => void;
  setUsername: (username: string) => void;
  
  // Real-time data actions
  setConnectedPlayers: (players: number) => void;
  setLiveBets: (bets: LiveBet[]) => void;
  addLiveBet: (bet: LiveBet) => void;
  removeLiveBet: (userId: string) => void;
  setRoundHistory: (history: RoundHistory[]) => void;
  addRoundHistory: (round: RoundHistory) => void;
  addGameHistory: (game: any) => void;
  
  // Insurance actions
  setInsuranceOptions: (options: InsuranceOption[] | null) => void;
  setSelectedInsurance: (insurance: InsuranceType | null) => void;
  
  // Chat actions
  setChatMessages: (messages: ChatMessage[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  
  // Statistics actions
  setPlayerStats: (stats: PlayerStats | null) => void;
  
  // Utility actions
  resetGame: () => void;
  resetPlayer: () => void;
}

const initialState: GameState = {
  // Game state
  currentRound: 0,
  isGameActive: false,
  gameState: 'waiting',
  roundTime: 0,
  multiplier: 1.00,
  integrity: 100,
  crashPoint: 0,
  
  // Player state
  playerBalance: 1000,
  currentBet: 0,
  hasPlacedBet: false,
  userId: null,
  username: null,
  
  // Real-time data
  connectedPlayers: 0,
  liveBets: [],
  roundHistory: [],
  gameHistory: [],
  
  // Insurance
  insuranceOptions: null,
  selectedInsurance: null,
  
  // Chat
  chatMessages: [],
  activeUsers: [],
  
  // Statistics
  playerStats: null,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  // Game state actions
  setCurrentRound: (round) => set({ currentRound: round }),
  setGameActive: (active) => set({ isGameActive: active }),
  setGameState: (state) => set({ gameState: state }),
  setRoundTime: (time) => set({ roundTime: time }),
  setMultiplier: (multiplier) => set({ multiplier }),
  setIntegrity: (integrity) => set({ integrity }),
  setCrashPoint: (crashPoint) => set({ crashPoint }),
  
  // Player actions
  setPlayerBalance: (balance) => set({ playerBalance: balance }),
  setCurrentBet: (bet) => set({ currentBet: bet }),
  setHasPlacedBet: (placed) => set({ hasPlacedBet: placed }),
  setUserId: (userId) => set({ userId }),
  setUsername: (username) => set({ username }),
  
  // Real-time data actions
  setConnectedPlayers: (players) => set({ connectedPlayers: players }),
  setLiveBets: (bets) => set({ liveBets: bets }),
  addLiveBet: (bet) => set((state) => ({
    liveBets: [...state.liveBets.filter(b => b.userId !== bet.userId), bet]
  })),
  removeLiveBet: (userId) => set((state) => ({
    liveBets: state.liveBets.filter(bet => bet.userId !== userId)
  })),
  setRoundHistory: (history) => set({ roundHistory: history }),
  addRoundHistory: (round) => set((state) => ({
    roundHistory: [round, ...state.roundHistory.slice(0, 9)]
  })),
  addGameHistory: (game) => set((state) => ({
    gameHistory: [game, ...state.gameHistory.slice(0, 9)]
  })),
  
  // Insurance actions
  setInsuranceOptions: (options) => set({ insuranceOptions: options }),
  setSelectedInsurance: (insurance) => set({ selectedInsurance: insurance }),
  
  // Chat actions
  setChatMessages: (messages) => set({ chatMessages: messages }),
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message].slice(-100) // Keep last 100 messages
  })),
  setActiveUsers: (users) => set({ activeUsers: users }),
  
  // Statistics actions
  setPlayerStats: (stats) => set({ playerStats: stats }),
  
  // Utility actions
  resetGame: () => set({
    isGameActive: false,
    gameState: 'waiting',
    roundTime: 0,
    multiplier: 1.00,
    integrity: 100,
    crashPoint: 0,
    currentBet: 0,
    hasPlacedBet: false,
    selectedInsurance: null,
    insuranceOptions: null,
  }),
  
  resetPlayer: () => set({
    playerBalance: 1000,
    currentBet: 0,
    hasPlacedBet: false,
    userId: null,
    username: null,
    playerStats: null,
  }),
})); 