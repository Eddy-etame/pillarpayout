import { create } from 'zustand';

interface GameState {
  currentRound: number;
  isGameActive: boolean;
  playerBalance: number;
  currentBet: number;
  gameHistory: any[];
  connectedPlayers: number;
  roundTime: number;
}

interface GameActions {
  setCurrentRound: (round: number) => void;
  setGameActive: (active: boolean) => void;
  setPlayerBalance: (balance: number) => void;
  setCurrentBet: (bet: number) => void;
  addGameHistory: (game: any) => void;
  setConnectedPlayers: (players: number) => void;
  setRoundTime: (time: number) => void;
  resetGame: () => void;
}

const initialState: GameState = {
  currentRound: 0,
  isGameActive: false,
  playerBalance: 1000,
  currentBet: 0,
  gameHistory: [],
  connectedPlayers: 0,
  roundTime: 0,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,

  setCurrentRound: (round) => set({ currentRound: round }),
  setGameActive: (active) => set({ isGameActive: active }),
  setPlayerBalance: (balance) => set({ playerBalance: balance }),
  setCurrentBet: (bet) => set({ currentBet: bet }),
  addGameHistory: (game) => set((state) => ({ 
    gameHistory: [game, ...state.gameHistory.slice(0, 9)] 
  })),
  setConnectedPlayers: (players) => set({ connectedPlayers: players }),
  setRoundTime: (time) => set({ roundTime: time }),
  resetGame: () => set(initialState),
})); 