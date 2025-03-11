import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService, ChatMessage, Profile } from '@/api/apiService';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@/context/UserContext';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Plus, Trash2, Edit, RefreshCw, Bot, Send } from 'lucide-react';

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
      <div key={messageKey} className={`flex items-start mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <Avatar className="h-10 w-10 mr-3">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot size={20} />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`px-4 py-3 rounded-lg max-w-3xl ${
            isUser
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-[#1e2130] text-gray-200 border border-white/[0.05]'
          }`}
        >
          <div className="text-xs text-gray-400 mb-1">{timestamp}</div>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm max-w-none"
              components={{
                pre: ({ node, ...props }) => (
                  <div className="bg-[#0f1117] p-3 rounded my-2 overflow-auto border border-white/[0.05]">
                    <pre {...props} />
                  </div>
                ),
                code: ({ node, className, inline, ...props }: any) => 
                  inline ? (
                    <code className="bg-[#0f1117] px-1 py-0.5 rounded text-gray-300" {...props} />
                  ) : (
                    <code className="text-gray-300" {...props} />
                  )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        {isUser && (
          <Avatar className="h-10 w-10 ml-3">
            {userProfile?.avatar ? (
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
      </div>
    );
  };

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

  // If there's a critical error, show a recovery UI
  if (error && !chatHistory.length && !profiles.length) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-6">{error}</p>
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="destructive"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={() => {
                  setError(null);
                  refreshProfiles();
                  refreshChatHistory();
                }} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0f1117]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.05]">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Chat</h1>
        
        <div className="flex flex-wrap gap-3">
          {/* Session dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 border-white/[0.05] bg-[#171923] hover:bg-white/[0.06] text-gray-300">
                <MessageSquare className="h-4 w-4" />
                <span>{sessions.find(s => s.id === sessionId)?.name || 'Session'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#171923] border-white/[0.05]">
              <div className="p-2">
                <div className="mb-2">
                  <Input
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="New session name"
                    className="mb-2 bg-[#0f1117] border-white/[0.05]"
                  />
                  <Button
                    onClick={() => {
                      if (newSessionName.trim()) {
                        createNewSession(newSessionName);
                        setNewSessionName('');
                      }
                    }}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create Session
                  </Button>
                </div>
                
                <Separator className="my-2 bg-white/[0.05]" />
                
                <div className="max-h-[300px] overflow-y-auto">
                  {sessions.map(session => (
                    <div key={session.id} className="mb-2 last:mb-0">
                      <div className={`p-2 rounded-md ${
                        session.id === sessionId 
                          ? 'bg-white/[0.08]' 
                          : 'hover:bg-white/[0.06]'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div className="flex-grow">
                            {editingSessionId === session.id ? (
                              <Input
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
                                className="text-sm bg-[#0f1117] border-white/[0.05]"
                              />
                            ) : (
                              <div>
                                <div 
                                  className="font-medium cursor-pointer text-gray-200" 
                                  onClick={() => {
                                    switchSession(session.id);
                                  }}
                                >
                                  {session.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(session.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-white/[0.06]"
                                    onClick={() => setEditingSessionId(session.id)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#171923] border-white/[0.05]">
                                  <p>Rename session</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:bg-white/[0.06]"
                                    onClick={() => deleteSession(session.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#171923] border-white/[0.05]">
                                  <p>Delete session</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Profile selector */}
          <div>
            <Select
              value={selectedProfile}
              onValueChange={handleProfileChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[180px] border-white/[0.05] bg-[#171923] text-gray-300">
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent className="bg-[#171923] border-white/[0.05]">
                {profiles.map((profile) => (
                  <SelectItem key={profile.name} value={profile.name} className="hover:bg-white/[0.06] focus:bg-white/[0.06]">
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            onClick={handleNewChat}
            disabled={isLoading}
            className="border-white/[0.05] bg-[#171923] hover:bg-white/[0.06] text-gray-300"
          >
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
          
          <Button
            variant="outline"
            onClick={handleClearChat}
            disabled={isLoading}
            className="border-white/[0.05] bg-[#171923] hover:bg-white/[0.06] text-gray-300"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear Chat
          </Button>
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {/* Messages container */}
        <Card className="flex-1 overflow-hidden mb-4 border-white/[0.05] bg-[#171923]">
          <CardContent className="p-4 h-full overflow-y-auto" ref={chatContainerRef}>
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-destructive mb-4">{error}</div>
                <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="destructive"
                  >
                    Refresh Page
                  </Button>
                  <Button 
                    onClick={() => {
                      setError(null);
                      refreshProfiles();
                      refreshChatHistory();
                    }} 
                    variant="outline"
                    className="border-white/[0.05] bg-[#171923] hover:bg-white/[0.06] text-gray-300"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredChatHistory.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-center">
                <h2 className="text-xl font-semibold mb-2 text-gray-200">No messages yet</h2>
                <p className="text-gray-400 mb-4">
                  Start a conversation by sending a message below.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChatHistory.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Message input */}
        <div className="flex-none">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow min-h-[60px] bg-[#171923] border-white/[0.05] text-gray-200 placeholder:text-gray-500"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (message.trim()) {
                    handleSendMessage(e);
                  }
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="self-end"
            >
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" /> Send
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 