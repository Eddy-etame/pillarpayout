import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import socket from '../../utils/socket';

const ChatWindow: React.FC = () => {
  const { 
    chatMessages, 
    activeUsers,
    userId,
    username,
    setChatMessages,
    addChatMessage,
    setActiveUsers
  } = useGameStore();

  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Connect to chat when user is authenticated
  useEffect(() => {
    if (userId && username) {
      socket.emit('join_chat', { userId, username });
      setIsConnected(true);
    }
  }, [userId, username]);

  // Listen for chat events
  useEffect(() => {
    const handleChatHistory = (history: any[]) => {
      setChatMessages(history.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        timestamp: new Date(msg.timestamp),
        type: msg.type || 'user'
      })));
    };

    const handleChatMessage = (message: any) => {
      addChatMessage({
        id: message.id,
        userId: message.userId,
        username: message.username,
        message: message.message,
        timestamp: new Date(message.timestamp),
        type: message.type || 'user'
      });
    };

    const handleActiveUsers = (users: any[]) => {
      setActiveUsers(users.map(user => ({
        username: user.username,
        lastActivity: new Date(user.lastActivity)
      })));
    };

    const handleUserJoined = (data: any) => {
      addChatMessage({
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} joined the chat`,
        timestamp: new Date(),
        type: 'system'
      });
    };

    const handleUserLeft = (data: any) => {
      addChatMessage({
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} left the chat`,
        timestamp: new Date(),
        type: 'system'
      });
    };

    const handleChatError = (error: any) => {
      console.error('Chat error:', error);
      alert(`Chat error: ${error.message}`);
    };

    // Listen for socket events
    socket.on('chat_history', handleChatHistory);
    socket.on('chat_message', handleChatMessage);
    socket.on('active_users', handleActiveUsers);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('chat_error', handleChatError);

    return () => {
      socket.off('chat_history');
      socket.off('chat_message');
      socket.off('active_users');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('chat_error');
    };
  }, [setChatMessages, addChatMessage, setActiveUsers]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userId) return;

    try {
      // Emit message to server
      socket.emit('chat_message', {
        userId: userId,
        message: newMessage.trim()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-900 border-blue-600 text-blue-200';
      case 'admin':
        return 'bg-red-900 border-red-600 text-red-200';
      default:
        return 'bg-slate-700 border-slate-600 text-white';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLeaveChat = () => {
    if (userId && username) {
      socket.emit('user_leave', { userId, username });
      setIsConnected(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-96 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Live Chat</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isConnected && (
              <button
                onClick={handleLeaveChat}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Leave
              </button>
            )}
          </div>
        </div>
        
        {/* Active Users Count */}
        <div className="mt-2 text-sm text-slate-400">
          {activeUsers.length} active users
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length > 0 ? (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg border ${getMessageStyle(message.type)}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm">
                  {message.username}
                </span>
                <span className="text-xs opacity-70">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{message.message}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-slate-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? "Type your message..." : "Connect to chat..."}
            className="flex-1 p-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            disabled={!isConnected || !userId}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected || !userId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
        
        {/* Character count */}
        <div className="mt-1 text-xs text-slate-500 text-right">
          {newMessage.length}/200
        </div>
      </form>
    </div>
  );
};

export default ChatWindow; 