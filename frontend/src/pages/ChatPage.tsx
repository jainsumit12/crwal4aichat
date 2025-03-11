import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { ChatMessage, ChatResponse, Profile, ProfilesResponse } from '@/api/apiService';
import { apiService } from '@/api/apiService';

const ChatPage = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate a session ID if one doesn't exist
    if (!sessionId) {
      setSessionId(uuidv4());
    }

    // Load profiles
    loadProfiles();

    // Load chat history
    loadChatHistory();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProfiles = async () => {
    try {
      const profilesResponse: ProfilesResponse = await apiService.getProfiles();
      setProfiles(profilesResponse.profiles);
      setActiveProfile(profilesResponse.active_profile);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profiles');
    }
  };

  const loadChatHistory = async () => {
    if (!sessionId) return;

    try {
      const history = await apiService.getChatHistory(sessionId);
      if (history && history.length > 0) {
        setMessages(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Don't show error toast for history loading
    }
  };

  const handleProfileChange = async (profileName: string) => {
    try {
      await apiService.setProfile(profileName);
      setActiveProfile(profileName);
      toast.success(`Profile changed to ${profileName}`);
    } catch (error) {
      console.error('Error changing profile:', error);
      toast.error('Failed to change profile');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const chatRequest = {
        message: userMessage.content,
        session_id: sessionId,
      };

      const response: ChatResponse = await apiService.sendMessage(chatRequest);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;

    try {
      await apiService.clearChatHistory(sessionId);
      setMessages([]);
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast.error('Failed to clear chat history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Chat with Your Data</h1>
        <div className="flex items-center space-x-2">
          <select
            className="input py-1 px-3 text-sm"
            value={activeProfile}
            onChange={(e) => handleProfileChange(e.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.name} value={profile.name}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            onClick={clearChat}
            className="btn-secondary py-1 px-3 text-sm"
            disabled={isLoading || messages.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 card p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No messages yet. Start a conversation!</p>
            <p className="text-sm mt-2">
              Ask questions about your crawled websites or documents.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.timestamp && (
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex space-x-2 mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="input flex-1"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-primary px-4"
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? (
            <span className="inline-block animate-spin">↻</span>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatPage; 