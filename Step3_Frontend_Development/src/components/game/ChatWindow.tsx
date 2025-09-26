import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'bet' | 'cashout';
}

const ChatWindow: React.FC = () => {
  const { user } = useAuthStore();
  const { isConnected, sendMessage } = useWebSocket();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      userId: 'system',
      username: 'System',
      message: 'Welcome to PillarPayout! Chat with other players and share your excitement! 🎮',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id?.toString() || 'anonymous',
      username: user.username || 'Anonymous',
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'user'
    };

    setMessages(prev => [...prev, message]);
    
    // Send message to backend via WebSocket
    if (isConnected) {
      sendMessage({
        type: 'chat_message',
        message: newMessage.trim(),
        userId: user.id,
        username: user.username
      });
    }

    setNewMessage('');
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!user) return;
    
    // Send typing indicator to other users
    if (isConnected) {
      sendMessage({
        type: 'typing_start',
        userId: user.id?.toString(),
        username: user.username
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isConnected) {
        sendMessage({
          type: 'typing_stop',
          userId: user.id?.toString(),
          username: user.username
        });
      }
    }, 3000);
  };

  // Add system messages for game events
  const addSystemMessage = (message: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      username: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  // Add bet/cashout messages
  const addGameMessage = (username: string, action: string, amount: number, multiplier?: number) => {
    const gameMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'game',
      username,
      message: multiplier 
        ? `${action} ${amount} FCFA at ${multiplier.toFixed(2)}x! 🎯`
        : `${action} ${amount} FCFA! 💰`,
      timestamp: new Date(),
      type: action.includes('bet') ? 'bet' : 'cashout'
    };
    setMessages(prev => [...prev, gameMessage]);
  };

  // Listen for chat messages and game events
  useEffect(() => {
    const handleIncomingChatMessage = (event: CustomEvent) => {
      const { message, username, userId } = event.detail;
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: userId || 'anonymous',
        username: username || 'Anonymous',
        message,
        timestamp: new Date(),
        type: 'user'
      };
      setMessages(prev => [...prev, chatMessage]);
    };

    const handleGameEventMessage = (event: CustomEvent) => {
      const { type, username, amount, multiplier } = event.detail;
      
      switch (type) {
        case 'bet_placed':
          addGameMessage(username, 'placed a bet of', amount);
          break;
        case 'cashout':
          addGameMessage(username, 'cashed out', amount, multiplier);
          break;
        case 'round_start':
          addSystemMessage('🎮 New round starting! Place your bets!');
          break;
        case 'round_crash':
          addSystemMessage('💥 Tower crashed! Better luck next time!');
          break;
        case 'big_win':
          addSystemMessage(`🎉 ${username} just won big with ${multiplier?.toFixed(2)}x multiplier!`);
          break;
        default:
          // Generic game event
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            userId: 'system',
            username: 'System',
            message: `Game Event: ${type} - ${JSON.stringify(event.detail)}`,
            timestamp: new Date(),
            type: 'system'
          }]);
      }
    };

    // Handle typing indicators from other users
    const handleTypingStart = (event: CustomEvent) => {
      const { username } = event.detail;
      if (username && username !== user?.username) {
        setTypingUsers(prev => new Set(prev).add(username));
      }
    };

    const handleTypingStop = (event: CustomEvent) => {
      const { username } = event.detail;
      if (username && username !== user?.username) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(username);
          return newSet;
        });
      }
    };

    window.addEventListener('chat_message', handleIncomingChatMessage as EventListener);
    window.addEventListener('game_event', handleGameEventMessage as EventListener);
    window.addEventListener('typing_start', handleTypingStart as EventListener);
    window.addEventListener('typing_stop', handleTypingStop as EventListener);

    return () => {
      window.removeEventListener('chat_message', handleIncomingChatMessage as EventListener);
      window.removeEventListener('game_event', handleGameEventMessage as EventListener);
      window.removeEventListener('typing_start', handleTypingStart as EventListener);
      window.removeEventListener('typing_stop', handleTypingStop as EventListener);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?.username]);

  // Toggle chat minimization
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // Get message styling based on type
  const getMessageStyle = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return 'bg-blue-600 text-white';
      case 'bet':
        return 'bg-green-600 text-white';
      case 'cashout':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-700 text-white';
    }
  };

  // Get username styling based on type
  const getUsernameStyle = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return 'text-blue-200 font-semibold';
      case 'bet':
        return 'text-green-200 font-semibold';
      case 'cashout':
        return 'text-purple-200 font-semibold';
      default:
        return 'text-gray-300 font-medium';
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 md:right-4 md:bottom-4 sm:right-2 sm:bottom-2">
      {/* Chat Toggle Button (when minimized) */}
      {isMinimized && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMinimized}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Chat"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      {/* Chat Container */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            ref={chatContainerRef}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-gray-800 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-sm w-96 h-[600px] md:w-96 md:h-[600px] sm:w-80 sm:h-[550px]`}
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-4 py-3 rounded-t-lg flex items-center justify-between border-b border-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold">Live Chat</span>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleMinimized}
                  className="text-gray-300 hover:text-white p-1 rounded transition-colors hover:bg-gray-500"
                  title="Minimize"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="overflow-y-auto p-3 space-y-2 h-[300px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 bg-gray-800">
              
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-2 rounded-lg ${getMessageStyle(message)}`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs ${getUsernameStyle(message)}`}>
                          {message.username}
                        </span>
                        <span className="text-xs opacity-60">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed break-words">
                        {message.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
              
              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="flex items-center space-x-2 text-xs text-gray-400 italic">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>
                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
            </div>

            {/* Chat Input Area - Fixed and Always Visible */}
            <div className="p-3 border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-700">
              {/* Compact Emoji Section */}
              <div className="mb-3">
                <div className="text-xs text-gray-400 font-medium mb-2 flex items-center">
                  <span className="mr-2">😊</span>
                  Quick Emojis
                </div>
                <div className="flex flex-wrap gap-2">
                  {['🎮', '💰', '🎯', '🔥', '💪', '🏗️', '💥', '🚀', '🎲', '⭐'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewMessage(prev => prev + emoji)}
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors text-sm hover:scale-110"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Input Field and Send Button */}
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  disabled={!isConnected}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {/* Status and Help Text */}
              <div className="text-xs text-gray-400 text-center bg-gray-800 bg-opacity-50 p-1 rounded">
                {isConnected ? (
                  <span className="flex items-center justify-center space-x-1">
                    <span>💬</span>
                    <span>Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs border border-gray-600">Enter</kbd> to send</span>
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center justify-center">
                    <span className="mr-1">🔌</span>
                    Connecting to chat...
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatWindow; 