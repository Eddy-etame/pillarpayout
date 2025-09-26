import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Tournament {
  id: string;
  name: string;
  type: string;
  entryFee: number;
  status: 'registration' | 'active' | 'completed';
  startTime: string;
  endTime: string;
  participants: number;
  maxPlayers: number;
  prizePool: number;
}

interface TournamentParticipant {
  userId: string;
  username: string;
  score: number;
  rank: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
}

const TournamentInterface: React.FC = () => {
  const { user, token } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTournaments = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/tournaments/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTournaments(data);
      }
    } catch (err) {
      console.error('Failed to fetch user tournaments:', err);
    }
  }, [user, token]);

  useEffect(() => {
    fetchActiveTournaments();
    if (user) {
      fetchUserTournaments();
    }
  }, [user, fetchUserTournaments]);

  const fetchActiveTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/tournaments');
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }
      
      const data = await response.json();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };



  const fetchTournamentLeaderboard = async (tournamentId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tournament leaderboard:', err);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/tournaments/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tournamentId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join tournament');
      }
      
      // Refresh tournaments
      await fetchActiveTournaments();
      await fetchUserTournaments();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    fetchTournamentLeaderboard(tournament.id);
  };

  const isUserInTournament = (tournamentId: string) => {
    return userTournaments.some(t => t.id === tournamentId);
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Tournaments</h3>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
              selectedTournament?.id === tournament.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => handleTournamentSelect(tournament)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">{tournament.name}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                tournament.status === 'active' ? 'bg-green-600 text-white' :
                tournament.status === 'registration' ? 'bg-blue-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {tournament.status}
              </span>
            </div>
            
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Entry Fee:</span>
                <span className="text-yellow-400">{tournament.entryFee} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Prize Pool:</span>
                <span className="text-green-400">{tournament.prizePool} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span>Players:</span>
                <span className="text-blue-400">{tournament.participants}/{tournament.maxPlayers}</span>
              </div>
            </div>
            
            {tournament.status === 'registration' && !isUserInTournament(tournament.id) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  joinTournament(tournament.id);
                }}
                disabled={loading}
                className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Joining...' : 'Join Tournament'}
              </button>
            )}
            
            {isUserInTournament(tournament.id) && (
              <div className="mt-2 text-xs text-green-400 font-medium">
                ✓ You're in this tournament!
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedTournament && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h4 className="text-md font-semibold text-white mb-3">
            {selectedTournament.name} Leaderboard
          </h4>
          
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((participant, index) => (
                <div key={participant.userId} className="flex justify-between items-center bg-gray-700 rounded p-2">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-white font-medium">{participant.username}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">{participant.score.toFixed(2)} pts</div>
                    <div className="text-xs text-gray-400">
                      {participant.totalBets} bets • {participant.totalWagered} FCFA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No leaderboard data available</p>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-400">
        <p>• Tournaments run for specific time periods</p>
        <p>• Score based on betting activity and wins</p>
        <p>• Top players win prizes from the entry fee pool</p>
      </div>
    </div>
  );
};

export default TournamentInterface;
