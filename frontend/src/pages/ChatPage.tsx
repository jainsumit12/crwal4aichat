import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService, ChatMessage, Profile } from '@/api/apiService';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/context/UserContext';
import remarkGfm from 'remark-gfm';

// Define the session interface
interface ChatSession {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
}

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { userProfile, extractPreferencesFromText, addPreference } = useUser();

  // Initialize sessions and session ID when component mounts
  useEffect(() => {
    // Load saved sessions from localStorage
    const storedSessions = localStorage.getItem('chat_sessions');
    const parsedSessions = storedSessions ? JSON.parse(storedSessions) : [];
    setSessions(parsedSessions);
    
    // Get current session ID from localStorage or create a new one
    const storedSessionId = localStorage.getItem('current_session_id');
    const storedChatInitialized = localStorage.getItem('chat_initialized') === 'true';
    
    if (storedSessionId && parsedSessions.some((s: ChatSession) => s.id === storedSessionId)) {
      // Use existing session
      setSessionId(storedSessionId);
      setChatInitialized(storedChatInitialized);
      
      // Update last activity
      updateSessionActivity(storedSessionId);
    } else {
      // Create a new session
      createNewSession('Default Session');
    }
  }, []); // Empty dependency array - run only once on mount

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Create a new session
  const createNewSession = (name: string) => {
    const newSession: ChatSession = {
      id: uuidv4(),
      name: name || `Session ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    setSessions(prev => [...prev, newSession]);
    setSessionId(newSession.id);
    setChatInitialized(false);
    setChatHistory([]);
    localStorage.setItem('current_session_id', newSession.id);
    localStorage.setItem('chat_initialized', 'false');
    
    return newSession.id;
  };

  // Update session activity timestamp
  const updateSessionActivity = (id: string) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, lastActivity: new Date().toISOString() } 
          : session
      )
    );
  };

  // Switch to a different session
  const switchSession = (id: string) => {
    if (id === sessionId) return; // Already on this session
    
    setSessionId(id);
    setChatHistory([]);
    setIsLoading(true);
    
    // Check if this session has been initialized
    const session = sessions.find(s => s.id === id);
    if (session) {
      updateSessionActivity(id);
      localStorage.setItem('current_session_id', id);
      
      // Load chat history for this session
      apiService.getChatHistory(id)
        .then(history => {
          setChatHistory(history);
          setChatInitialized(history.length > 0);
          localStorage.setItem('chat_initialized', history.length > 0 ? 'true' : 'false');
        })
        .catch(error => {
          console.error('Error loading session history:', error);
          setChatInitialized(false);
          localStorage.setItem('chat_initialized', 'false');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  // Rename a session
  const renameSession = (id: string, newName: string) => {
    if (!newName.trim()) return;
    
    setSessions(prev => 
      prev.map(session => 
        session.id === id 
          ? { ...session, name: newName.trim() } 
          : session
      )
    );
    setEditingSessionId(null);
  };

  // Delete a session
  const deleteSession = async (id: string) => {
    if (sessions.length === 1) {
      toast.error('Cannot delete the only session');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this session? This will clear all chat history for this session.')) {
      try {
        // Clear chat history on the server
        await apiService.clearChatHistory(id);
        
        // Remove from local state
        setSessions(prev => prev.filter(session => session.id !== id));
        
        // If we're deleting the current session, switch to another one
        if (id === sessionId) {
          const remainingSessions = sessions.filter(session => session.id !== id);
          if (remainingSessions.length > 0) {
            switchSession(remainingSessions[0].id);
          } else {
            createNewSession('Default Session');
          }
        }
        
        toast.success('Session deleted');
      } catch (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete session');
      }
    }
  };

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
            // Update session activity
            updateSessionActivity(sessionId);
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
        
        // Update session activity
        updateSessionActivity(sessionId);
        
        toast.success('Chat history cleared');
      } catch (error) {
        console.error('Error clearing chat history:', error);
        setError('Failed to clear chat history. Please try again.');
        toast.error('Failed to clear chat history');
      }
    }
  };

  const handleNewChat = () => {
    if (window.confirm('Start a new chat? This will keep your current session but clear the current conversation.')) {
      setChatHistory([]);
      setChatInitialized(false);
      localStorage.setItem('chat_initialized', 'false');
      
      // Update session activity
      updateSessionActivity(sessionId);
      
      toast.success('Started new chat');
    }
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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm max-w-none prose-invert"
              components={{
                pre: ({ node, ...props }) => (
                  <div className="bg-gray-900 p-2 rounded my-2 overflow-auto">
                    <pre {...props} />
                  </div>
                ),
                code: ({ node, className, inline, ...props }: any) => 
                  inline ? (
                    <code className="bg-gray-900 px-1 py-0.5 rounded" {...props} />
                  ) : (
                    <code {...props} />
                  )
              }}
            >
              {message.content}
            </ReactMarkdown>
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
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-4">Chat</h1>
        
        <div className="flex flex-wrap gap-3">
          {/* Session dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSessionManager(!showSessionManager)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <span>{sessions.find(s => s.id === sessionId)?.name || 'Session'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            
            {showSessionManager && (
              <div className="absolute left-0 top-full mt-1 z-10 w-72 bg-gray-800 rounded shadow-lg border border-gray-700">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white">Manage Sessions</h3>
                    <button 
                      onClick={() => setShowSessionManager(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        placeholder="New session name"
                        className="bg-gray-700 text-white border-gray-600 rounded px-3 py-1 flex-grow focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          if (newSessionName.trim()) {
                            createNewSession(newSessionName);
                            setNewSessionName('');
                            setShowSessionManager(false);
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sessions.map(session => (
                      <div 
                        key={session.id} 
                        className={`p-2 rounded flex justify-between items-center ${
                          session.id === sessionId 
                            ? 'bg-blue-900' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex-grow">
                          {editingSessionId === session.id ? (
                            <input
                              type="text"
                              defaultValue={session.name}
                              autoFocus
                              onBlur={(e) => renameSession(session.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameSession(session.id, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null);
                                }
                              }}
                              className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <div>
                              <div 
                                className="font-medium cursor-pointer text-white" 
                                onClick={() => {
                                  switchSession(session.id);
                                  setShowSessionManager(false);
                                }}
                              >
                                {session.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                Created: {new Date(session.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {session.id !== sessionId && (
                            <button
                              onClick={() => {
                                switchSession(session.id);
                                setShowSessionManager(false);
                              }}
                              className="text-blue-400 hover:text-blue-300"
                              title="Use this session"
                            >
                              Use
                            </button>
                          )}
                          <button
                            onClick={() => setEditingSessionId(session.id)}
                            className="text-gray-400 hover:text-white"
                            title="Rename session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete session"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile selector */}
          <div>
            <div className="text-xs text-gray-400 mb-1">Profile</div>
            <select
              value={selectedProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            >
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleNewChat}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
            disabled={isLoading}
          >
            New Chat
          </button>
          
          <button
            onClick={handleClearChat}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
            disabled={isLoading}
          >
            Clear Chat
          </button>
        </div>
      </div>
      
      {/* Main chat area - fixed layout */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Messages container with fixed height */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 bg-gray-800 rounded-lg p-4"
          style={{ minHeight: "200px" }}
        >
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-red-400 mb-4">{error}</div>
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Refresh Page
                </button>
                <button 
                  onClick={() => {
                    setError(null);
                    refreshProfiles();
                    refreshChatHistory();
                  }} 
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center">
              <h2 className="text-xl font-semibold mb-2 text-white">No messages yet</h2>
              <p className="text-gray-400 mb-4">
                Start a conversation by sending a message below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((message) => {
                if (message.role === 'system') return null;
                
                const isUser = message.role === 'user';
                const timestamp = message.created_at ? formatTimestamp(message.created_at) : 'Just now';
                const messageKey = message.id || `${message.role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                return (
                  <div key={messageKey} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        isUser ? 'bg-blue-600 ml-3' : 'bg-indigo-600 mr-3'
                      }`}>
                        {isUser ? (
                          <div className="text-white font-semibold">
                            {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        ) : (
                          <div className="text-white">A</div>
                        )}
                      </div>
                      
                      {/* Message content */}
                      <div>
                        <div className={`px-4 py-3 rounded-lg ${
                          isUser ? 'bg-blue-700' : 'bg-gray-700'
                        }`}>
                          <p className="text-white whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input - fixed at bottom */}
        <div className="flex-none">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg"
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 