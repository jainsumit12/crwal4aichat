import axios from 'axios';

// Base URL for API requests - ensure trailing slash
const API_BASE_URL = '/api';

// Create axios instance with custom config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Site interfaces
export interface Site {
  id: number;
  name: string;
  url: string;
  description: string;
  page_count: number;
  created_at: string;
}

// Page interfaces
export interface Page {
  id: number;
  url: string;
  title: string;
  content: string;
  summary: string;
  is_chunk: boolean;
  chunk_index: number | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

// Search interfaces
export interface SearchResult {
  id: number;
  url: string;
  title: string;
  content: string;
  summary: string;
  similarity: number;
  is_chunk: boolean;
  chunk_index: number | null;
  parent_id: number | null;
  site_id: number;
  site_name: string;
}

// Crawl interfaces
export interface CrawlRequest {
  url: string;
  site_name?: string;
  site_description?: string;
  is_sitemap?: boolean;
  max_urls?: number;
}

export interface CrawlResponse {
  site_id: number;
  site_name: string;
  url: string;
  message: string;
  status: string;
  next_steps: {
    check_status: string;
    view_pages: string;
    search_content: string;
  };
}

export interface CrawlStatus {
  site_id: number;
  site_name: string;
  url: string;
  page_count: number;
  chunk_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
  next_steps: {
    view_pages: string;
    search_content: string;
  };
}

// Chat interfaces
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  profile?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  user_id: string | null;
  context?: SearchResult[];
  conversation_history?: ChatMessage[];
}

export interface Profile {
  name: string;
  description: string;
}

export interface ProfilesResponse {
  profiles: Profile[];
  active_profile: string;
}

// API service
export const apiService = {
  // Site methods
  getSites: async (): Promise<Site[]> => {
    const response = await apiClient.get('/sites/');
    return response.data;
  },

  getSite: async (siteId: number): Promise<Site> => {
    const response = await apiClient.get(`/sites/${siteId}/`);
    return response.data;
  },

  getSitePages: async (siteId: number): Promise<Page[]> => {
    const response = await apiClient.get(`/sites/${siteId}/pages/`);
    return response.data;
  },

  // Crawl methods
  startCrawl: async (crawlRequest: CrawlRequest): Promise<CrawlResponse> => {
    const response = await apiClient.post('/crawl/', crawlRequest);
    return response.data;
  },

  getCrawlStatus: async (siteId: number): Promise<CrawlStatus> => {
    const response = await apiClient.get(`/crawl/status/${siteId}/`);
    return response.data;
  },

  // Search methods
  search: async (query: string, siteId?: number): Promise<SearchResult[]> => {
    const params = siteId ? { query, site_id: siteId } : { query };
    const response = await apiClient.get('/search/', { params });
    return response.data;
  },

  // Chat methods
  sendMessage: async (chatRequest: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post('/chat/', chatRequest);
    return response.data;
  },

  getProfiles: async (): Promise<ProfilesResponse> => {
    const response = await apiClient.get('/chat/profiles/');
    return response.data;
  },

  setProfile: async (profileName: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/chat/profiles/set/', {
      profile: profileName,
    });
    return response.data;
  },

  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get(`/chat/history/${sessionId}/`);
    return response.data;
  },

  clearChatHistory: async (sessionId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/chat/history/${sessionId}/`);
    return response.data;
  },
}; 