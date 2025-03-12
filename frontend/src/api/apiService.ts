import axios from 'axios';

// Base URL for API requests - ensure trailing slash
const API_BASE_URL = '/api';

// Simple cache for GET requests
interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number; // Time in milliseconds when this entry expires
}

const apiCache: Record<string, CacheEntry> = {};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  default: 60 * 1000, // 1 minute
  sites: 5 * 60 * 1000, // 5 minutes
  profiles: 10 * 60 * 1000, // 10 minutes
};

// Create an axios instance with the base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Minimal logging to prevent console spam
// Only log errors and important operations
const IMPORTANT_ENDPOINTS = ['/chat/', '/crawl/'];

// Add request interceptor with caching for GET requests
apiClient.interceptors.request.use(async (request) => {
  // Only log POST/PUT/DELETE requests or important endpoints
  const isImportantEndpoint = IMPORTANT_ENDPOINTS.some(endpoint => 
    request.url?.includes(endpoint)
  );
  
  if (request.method !== 'get' || isImportantEndpoint) {
    console.log(`API Request: ${request.method?.toUpperCase()} ${request.url}`);
  }

  // Check cache for GET requests
  if (request.method === 'get' && request.url) {
    const cacheKey = `${request.url}${JSON.stringify(request.params || {})}`;
    const cachedResponse = apiCache[cacheKey];
    
    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      // Return cached response
      console.log(`Using cached response for ${request.url}`);
      
      // Create a new Promise that resolves with the cached data
      return Promise.resolve({
        ...request,
        adapter: () => {
          return Promise.resolve({
            data: cachedResponse.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: request,
            request: request
          });
        }
      });
    }
  }
  
  return request;
});

// Add response interceptor with caching
apiClient.interceptors.response.use(
  response => {
    // Only log responses for non-GET requests or important endpoints
    const isImportantEndpoint = IMPORTANT_ENDPOINTS.some(endpoint => 
      response.config.url?.includes(endpoint)
    );
    
    if (response.config.method !== 'get' || isImportantEndpoint) {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    
    // Cache successful GET responses
    if (response.config.method === 'get' && response.config.url) {
      const url = response.config.url;
      const cacheKey = `${url}${JSON.stringify(response.config.params || {})}`;
      
      // Determine cache expiry based on endpoint
      let expiryTime = CACHE_EXPIRY.default;
      if (url.includes('/sites/')) {
        expiryTime = CACHE_EXPIRY.sites;
      } else if (url.includes('/profiles/')) {
        expiryTime = CACHE_EXPIRY.profiles;
      }
      
      // Store in cache
      apiCache[cacheKey] = {
        data: response.data,
        timestamp: Date.now(),
        expiry: Date.now() + expiryTime
      };
    }
    
    return response;
  },
  error => {
    console.error('API Error:', 
      error.response?.status || 'Network Error', 
      error.config?.url || 'Unknown URL',
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

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
  content?: string;
  summary: string;
  is_chunk: boolean;
  chunk_index: number | null;
  parent_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Search interfaces
export interface SearchResult {
  id: number;
  url: string;
  title: string;
  content?: string;
  snippet?: string;
  summary?: string;
  similarity: number;
  context?: string | null;
  is_chunk: boolean;
  chunk_index: number | null;
  parent_id: number | null;
  parent_title?: string | null;
  site_id: number;
  site_name?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  count: number;
  query: string;
  threshold: number;
  use_embedding: boolean;
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
  name?: string;
  url: string;
  page_count: number;
  chunk_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
  status?: string;
  progress?: number;
  pages_crawled?: number;
  pages_found?: number;
  max_pages?: number;
  depth?: number;
  error?: string;
  next_steps: {
    view_pages: string;
    search_content: string;
  };
}

// Chat interfaces
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
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
    try {
      const response = await apiClient.get('/sites');
      console.log('Raw sites response:', response.data);
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.sites && Array.isArray(response.data.sites)) {
        // This is the expected format from the API: { sites: [...], count: number }
        console.log('Found sites array in response:', response.data.sites);
        return response.data.sites;
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract sites from the response object
        const possibleSites = Object.values(response.data).find(val => Array.isArray(val));
        if (possibleSites && Array.isArray(possibleSites)) {
          console.log('Found possible sites array in response:', possibleSites);
          return possibleSites as Site[];
        }
      }
      
      // If we can't determine the format, return an empty array
      console.error('Unexpected sites response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  },

  getSite: async (siteId: number): Promise<Site> => {
    try {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting site ${siteId}:`, error);
      throw error;
    }
  },

  getSitePages: async (siteId: number, includeChunks: boolean = false): Promise<Page[] | { pages: Page[] }> => {
    try {
      const response = await apiClient.get(`/sites/${siteId}/pages`, {
        params: { include_chunks: includeChunks }
      });
      
      console.log('Raw site pages response:', response.data);
      
      // Return the data as is, let the component handle the format
      return response.data;
    } catch (error) {
      console.error(`Error getting pages for site ${siteId}:`, error);
      throw error;
    }
  },

  getPageById: async (pageId: number): Promise<Page> => {
    try {
      const response = await apiClient.get(`/pages/${pageId}`);
      console.log('Page by ID response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting page ${pageId}:`, error);
      throw error;
    }
  },

  getPageChunks: async (pageId: number): Promise<Page[]> => {
    try {
      const response = await apiClient.get(`/pages/${pageId}/chunks`);
      console.log('Page chunks response:', response.data);
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.chunks && Array.isArray(response.data.chunks)) {
        return response.data.chunks;
      } else {
        console.error('Unexpected page chunks response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error(`Error getting chunks for page ${pageId}:`, error);
      throw error;
    }
  },

  // Crawl methods
  startCrawl: async (crawlRequest: any): Promise<CrawlStatus> => {
    try {
      const response = await apiClient.post('/crawl/', crawlRequest);
      
      // Check if the response contains a site_id
      if (response.data && response.data.site_id) {
        // Return the crawl status
        return response.data;
      } else {
        throw new Error('Invalid response from crawl API');
      }
    } catch (error) {
      console.error('Error starting crawl:', error);
      throw error;
    }
  },

  getCrawlStatus: async (siteId?: string | number): Promise<CrawlStatus | CrawlStatus[]> => {
    try {
      // If no siteId is provided, try to get all sites instead
      if (!siteId) {
        console.log('No siteId provided, fetching all sites instead');
        return apiService.getSites() as unknown as CrawlStatus[];
      }
      
      // Use the correct endpoint format with siteId
      const endpoint = `/crawl/status/${siteId}/`;
      
      console.log('Fetching crawl status from:', endpoint);
      const response = await apiClient.get(endpoint);
      console.log('Crawl status response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching crawl status:', error);
      throw error;
    }
  },

  // Search methods
  search: async (
    query: string, 
    siteId?: number, 
    threshold: number = 0.3, 
    limit: number = 10,
    textOnly: boolean = false
  ): Promise<SearchResult[]> => {
    try {
      const response = await apiClient.get('/search/', {
        params: {
          query,
          site_id: siteId,
          threshold,
          limit,
          text_only: textOnly
        }
      });
      
      // Handle both array response and SearchResponse object
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      } else {
        console.error('Unexpected search response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  },

  // Chat methods
  sendMessage: async (message: string, profile: string, sessionId?: string, userName?: string): Promise<ChatMessage> => {
    try {
      const payload: any = { 
        message, 
        profile
      };
      
      // Use the user's name as the user_id if provided, otherwise use the profile name
      if (userName) {
        payload.user_id = userName;
      }
      
      // Add session_id if provided
      if (sessionId) {
        payload.session_id = sessionId;
      }
      
      const response = await apiClient.post('/chat/', payload);
      
      console.log('Chat response:', response.data);
      
      // Handle different response formats
      if (response.data && typeof response.data === 'object') {
        if (response.data.response) {
          // Standard format: { response: string, session_id: string, ... }
          return {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.data.response,
            created_at: new Date().toISOString()
          };
        } else if (response.data.content) {
          // Message format: { role: string, content: string, ... }
          return {
            id: Date.now().toString(),
            role: response.data.role || 'assistant',
            content: response.data.content,
            created_at: new Date().toISOString()
          };
        }
      }
      
      // Fallback for unexpected formats
      console.error('Unexpected chat response format:', response.data);
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: typeof response.data === 'string' 
          ? response.data 
          : 'Received an unexpected response format. Please try again.',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  getProfiles: async (sessionId?: string): Promise<Profile[]> => {
    try {
      const params: any = {};
      
      // Add session_id if provided
      if (sessionId) {
        params.session_id = sessionId;
      }
      
      // Use URL without trailing slash
      const response = await apiClient.get('/chat/profiles', { params });
      
      // Handle both array response and ProfilesResponse object
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.profiles)) {
        return response.data.profiles;
      } else {
        console.error('Unexpected profiles response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error getting profiles:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  setProfile: async (profileId: string, sessionId?: string, userName?: string): Promise<void> => {
    try {
      const params: any = {};
      
      // Use the user's name as the user_id if provided
      if (userName) {
        params.user_id = userName;
      }
      
      // Add session_id if provided
      if (sessionId) {
        params.session_id = sessionId;
      }
      
      // Use URL without trailing slash
      await apiClient.post(`/chat/profiles/${profileId}`, null, { params });
      
      // Clear any cached chat history to ensure fresh data with the new profile
      if (sessionId) {
        const cacheKey = `/chat/history/${JSON.stringify({ session_id: sessionId })}`;
        if (apiCache[cacheKey]) {
          delete apiCache[cacheKey];
          console.log('Cleared chat history cache after profile change');
        }
      }
    } catch (error) {
      console.error('Error setting profile:', error);
      // Don't throw to prevent UI errors
    }
  },

  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      // Use the correct endpoint format with query parameters
      const response = await apiClient.get('/chat/history', {
        params: { session_id: sessionId }
      });
      
      let messages: ChatMessage[] = [];
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        // Format: ChatMessage[]
        messages = response.data;
      } else if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
        // Format: { messages: ChatMessage[], count: number, ... }
        messages = response.data.messages;
      } else if (response.data && typeof response.data === 'object') {
        // Try to extract messages from the response object
        const possibleMessages = Object.values(response.data).find(val => Array.isArray(val));
        if (possibleMessages && Array.isArray(possibleMessages)) {
          messages = possibleMessages as ChatMessage[];
        }
      }
      
      // Filter out system messages
      const filteredMessages = messages.filter(message => message.role !== 'system');
      
      return filteredMessages;
    } catch (error) {
      console.error('Error getting chat history:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  clearChatHistory: async (sessionId: string): Promise<void> => {
    try {
      await apiClient.delete('/chat/history', {
        params: { session_id: sessionId }
      });
      
      // Clear the cache for this session's chat history
      // This prevents old messages from reappearing after clearing
      const cacheKey = `/chat/history/${JSON.stringify({ session_id: sessionId })}`;
      if (apiCache[cacheKey]) {
        delete apiCache[cacheKey];
        console.log('Cleared chat history cache for session:', sessionId);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }
}; 