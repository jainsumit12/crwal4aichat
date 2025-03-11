import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService, ChatMessage, Profile } from '@/api/apiService';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/context/UserContext';
import remarkGfm from 'remark-gfm';

const ChatPage = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatInitialized, setChatInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { userProfile, extractPreferencesFromText, addPreference } = useUser();

  // Initialize session ID only once when component mounts
  useEffect(() => {
    // Get session ID from localStorage or create a new one
    const storedSessionId = localStorage.getItem('chat_session_id');
    const storedChatInitialized = localStorage.getItem('chat_initialized') === 'true';
    
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setChatInitialized(storedChatInitialized);
    } else {
      const newSessionId = uuidv4();
      localStorage.setItem('chat_session_id', newSessionId);
      localStorage.setItem('chat_initialized', 'false');
      setSessionId(newSessionId);
      setChatInitialized(false);
    }
  }, []); // Empty dependency array - run only once on mount

  // Load profiles and chat history only once when sessionId is available
  useEffect(() => {
    // Only run this effect if sessionId is available and not empty
    if (sessionId && !isLoadingProfiles) {
      // Load profiles first
      const fetchProfiles = async () => {
        setIsLoadingProfiles(true);
        try {
          const profilesData = await apiService.getProfiles();
          if (Array.isArray(profilesData)) {
            setProfiles(profilesData);
            if (profilesData.length > 0 && !selectedProfile) {
              setSelectedProfile(profilesData[0].name);
            }
          }
        } catch (error) {
          console.error('Error loading profiles:', error);
          toast.error('Failed to load profiles');
        } finally {
          setIsLoadingProfiles(false);
        }
      };

      // Load chat history if chat is initialized
      const fetchChatHistory = async () => {
        if (chatInitialized && !isLoadingHistory) {
          setIsLoadingHistory(true);
          try {
            const history = await apiService.getChatHistory(sessionId);
            setChatHistory(history);
          } catch (error) {
            console.error('Error loading chat history:', error);
          } finally {
            setIsLoadingHistory(false);
          }
        }
      };

      // Execute the fetch functions
      fetchProfiles();
      if (chatInitialized) {
        fetchChatHistory();
      }
    }
  }, [sessionId, chatInitialized, isLoadingProfiles, isLoadingHistory, selectedProfile]); // Added dependencies

  // Scroll to bottom when chat history changes
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Wrap API calls in error handling
  const safeApiCall = useCallback(async <T,>(
    apiFunction: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      return await apiFunction();
    } catch (err) {
      console.error(`${errorMessage}:`, err);
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!selectedProfile) {
      toast.error('Please select a profile');
      return;
    }

    if (!sessionId) {
      toast.error('No session ID available');
      return;
    }
    
    // Mark chat as initialized if this is the first message
    if (!chatInitialized) {
      setChatInitialized(true);
      localStorage.setItem('chat_initialized', 'true');
    }
    
    // Check for preferences in the message - safely handle if function doesn't exist
    try {
      if (extractPreferencesFromText) {
        const extractedPreferences = extractPreferencesFromText(message);
        if (extractedPreferences && extractedPreferences.length > 0) {
          // Add the preferences
          extractedPreferences.forEach((pref: string) => {
            if (addPreference) {
              addPreference(pref);
            }
          });
          
          // Notify the user if preferences were found
          if (extractedPreferences.length === 1) {
            toast.success(`Added "${extractedPreferences[0]}" to your preferences`);
          } else if (extractedPreferences.length > 1) {
            toast.success(`Added ${extractedPreferences.length} new preferences`);
          }
        }
      }
    } catch (err) {
      console.error('Error processing preferences:', err);
      // Continue with the chat even if preference extraction fails
    }
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    
    setChatHistory((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Show typing indicator
      scrollToBottom();
      
      // Send message to API with sessionId and user's name
      const response = await apiService.sendMessage(
        message, 
        selectedProfile, 
        sessionId,
        userProfile?.name // Pass the user's name as the user_id
      );
      
      // Filter out system messages to prevent duplicates
      if (response) {
        // Only add the response if it's not a system message or if we don't already have it
        if (response.role !== 'system' || !chatHistory.some(msg => 
          msg.role === 'system' && msg.content === response.content
        )) {
          setChatHistory((prev) => [...prev, response]);
        }
      }
      
      // Scroll to bottom again after response
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      toast.error('Failed to send message');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!sessionId) {
      toast.error('No session ID available');
      return;
    }
    
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setError(null);
      try {
        await apiService.clearChatHistory(sessionId);
        
        // Clear the chat history in the UI
        setChatHistory([]);
        
        // Reset chat initialization state
        setChatInitialized(false);
        localStorage.setItem('chat_initialized', 'false');
        
        // Force a refresh of the session to ensure a clean state
        const newSessionId = uuidv4();
        localStorage.setItem('chat_session_id', newSessionId);
        setSessionId(newSessionId);
        
        toast.success('Chat history cleared');
      } catch (error) {
        console.error('Error clearing chat history:', error);
        setError('Failed to clear chat history. Please try again.');
        toast.error('Failed to clear chat history');
      }
    }
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setChatInitialized(false);
    localStorage.setItem('chat_initialized', 'false');
    
    // Generate a new session ID
    const newSessionId = uuidv4();
    localStorage.setItem('chat_session_id', newSessionId);
    setSessionId(newSessionId);
    
    toast.success('Started a new chat');
  };

  const handleProfileChange = async (profileId: string) => {
    if (!sessionId) {
      toast.error('No session ID available');
      return;
    }
    
    setSelectedProfile(profileId);
    setError(null);
    
    // Optionally set the profile in the backend
    try {
      await apiService.setProfile(
        profileId, 
        sessionId,
        userProfile?.name // Pass the user's name as the user_id
      );
      toast.success('Profile updated');
    } catch (error) {
      console.error('Error setting profile:', error);
      setError('Failed to update profile. Please try again.');
      toast.error('Failed to update profile');
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      // Check if timestamp is valid
      if (!timestamp || timestamp === 'undefined' || timestamp === 'null') {
        return 'Just now';
      }
      
      const date = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      // Format the date
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Just now';
    }
  };

  // Filter out system messages completely when rendering
  const filteredChatHistory = chatHistory.filter(message => message.role !== 'system');

  const renderMessage = (message: ChatMessage) => {
    // Skip system messages completely
    if (message.role === 'system') return null;

    const isUser = message.role === 'user';
    const timestamp = message.created_at ? formatTimestamp(message.created_at) : 'Just now';
    
    // Create a unique key using message ID or content hash if ID is not available
    const messageKey = message.id || `${message.role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div key={messageKey} className={`flex items-start mb-4 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-lg max-w-3xl ${
            isUser
              ? 'ml-3 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
              : 'ml-3 bg-gray-100 dark:bg-gray-700'
          }`}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{timestamp}</div>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
        {isUser && (
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ml-3">
            {userProfile.avatar ? (
              <img 
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // If there's a critical error, show a recovery UI
  if (error && !chatHistory.length && !profiles.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4">Something went wrong</h2>
          <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => {
                setError(null);
                refreshProfiles();
                refreshChatHistory();
              }} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Define the refresh functions at the component level
  const refreshProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const profilesData = await apiService.getProfiles();
      if (Array.isArray(profilesData)) {
        setProfiles(profilesData);
        if (profilesData.length > 0 && !selectedProfile) {
          setSelectedProfile(profilesData[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const refreshChatHistory = async () => {
    if (chatInitialized && !isLoadingHistory) {
      setIsLoadingHistory(true);
      try {
        const history = await apiService.getChatHistory(sessionId);
        setChatHistory(history);
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Chat with Your Data</h1>
        <div className="flex space-x-2">
          <select
            value={selectedProfile}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            {profiles.length === 0 && <option value="">Loading profiles...</option>}
            {profiles.map((profile) => (
              <option key={profile.name} value={profile.name}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors"
            disabled={isLoading}
          >
            New Chat
          </button>
          <button
            onClick={handleClearChat}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition-colors"
            disabled={isLoading || chatHistory.length === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
      >
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin text-4xl">↻</div>
          </div>
        ) : filteredChatHistory.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Start a conversation by sending a message below.
            </p>
          </div>
        ) : (
          <>
            {filteredChatHistory.map((msg) => renderMessage(msg))}
            {isLoading && (
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-3xl">
                  <div className="animate-pulse flex space-x-1">
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          disabled={isLoading || !message.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatPage; 