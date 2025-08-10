import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system';
}

const ChatWindow: React.FC = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', username: 'System', message: 'Welcome to PillarPayout! 🎮', timestamp: new Date(), type: 'system' },
    { id: '2', username: 'Player123', message: 'Good luck everyone!', timestamp: new Date(), type: 'user' },
  ]);
  const [activeUsers] = useState(1234);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const message: ChatMessage = { id: Date.now().toString(), username: user.username, message: newMessage.trim(), timestamp: new Date(), type: 'user' };
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2"><MessageCircle className="w-5 h-5 text-blue-400" /><h3 className="text-lg font-semibold">Live Chat</h3></div>
        <div className="flex items-center space-x-2 text-sm text-gray-400"><Users className="w-4 h-4" /><span>{activeUsers} online</span></div>
      </div>
      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'system' ? 'justify-center' : 'justify-start'}`}>
            {message.type === 'system' ? (
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">{message.message}</div>
            ) : (
              <div className="bg-gray-700 rounded-lg p-3 max-w-xs">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-blue-400">{message.username}</span>
                  <span className="text-xs text-gray-400">{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-200">{message.message}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!user} />
          <button type="submit" disabled={!newMessage.trim() || !user} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ChatWindow; 