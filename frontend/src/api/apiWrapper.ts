import { apiService, ChatMessage, Profile } from './apiService';
import { trackApiCall } from '@/utils/notifications';

// Create a wrapper around the API service that integrates our notification system
export const api = {
  // Site methods
  getSites: () => trackApiCall(
    apiService.getSites(),
    {
      pendingTitle: 'Loading Sites',
      pendingMessage: 'Fetching available sites...',
      successTitle: 'Sites Loaded',
      successMessage: 'Successfully loaded sites',
      errorTitle: 'Failed to Load Sites',
      showToast: false, // Don't show toast for background operations
      showNotification: false // Don't show notification for this operation at all
    }
  ),

  getSite: (siteId: number) => trackApiCall(
    apiService.getSite(siteId),
    {
      pendingTitle: 'Loading Site',
      pendingMessage: `Fetching site details for ID ${siteId}...`,
      successTitle: 'Site Loaded',
      successMessage: 'Successfully loaded site details',
      errorTitle: 'Failed to Load Site',
      showToast: false
    }
  ),

  getSitePages: (siteId: number, includeChunks: boolean = false) => trackApiCall(
    apiService.getSitePages(siteId, includeChunks),
    {
      pendingTitle: 'Loading Pages',
      pendingMessage: `Fetching pages for site ID ${siteId}...`,
      successTitle: 'Pages Loaded',
      successMessage: 'Successfully loaded site pages',
      errorTitle: 'Failed to Load Pages',
      showToast: false
    }
  ),

  getPageById: (pageId: number) => trackApiCall(
    apiService.getPageById(pageId),
    {
      pendingTitle: 'Loading Page',
      pendingMessage: `Fetching page details for ID ${pageId}...`,
      successTitle: 'Page Loaded',
      successMessage: 'Successfully loaded page details',
      errorTitle: 'Failed to Load Page',
      showToast: false
    }
  ),

  // Crawl methods
  startCrawl: (crawlRequest: any) => trackApiCall(
    apiService.startCrawl(crawlRequest),
    {
      pendingTitle: 'Starting Crawl',
      pendingMessage: `Starting crawl for ${crawlRequest.url}...`,
      successTitle: 'Crawl Started',
      successMessage: `Successfully started crawling ${crawlRequest.url}`,
      errorTitle: 'Failed to Start Crawl',
      showToast: false
    }
  ),

  getCrawlStatus: (siteId?: string | number) => trackApiCall(
    apiService.getCrawlStatus(siteId),
    {
      pendingTitle: 'Checking Crawl Status',
      pendingMessage: siteId ? `Checking status for site ID ${siteId}...` : 'Checking status of all crawls...',
      successTitle: 'Crawl Status',
      successMessage: 'Successfully retrieved crawl status',
      errorTitle: 'Failed to Get Crawl Status',
      showToast: false
    }
  ),

  // Search methods
  search: (query: string, siteId?: number, threshold: number = 0.3, limit: number = 10, textOnly: boolean = false) => trackApiCall(
    apiService.search(query, siteId, threshold, limit, textOnly),
    {
      pendingTitle: 'Searching',
      pendingMessage: `Searching for "${query}"...`,
      successTitle: 'Search Complete',
      successMessage: 'Search completed successfully',
      errorTitle: 'Search Failed',
      showToast: true
    }
  ),

  // Chat methods
  sendMessage: (message: string, profile: string, sessionId?: string, userName?: string) => trackApiCall(
    apiService.sendMessage(message, profile, sessionId, userName),
    {
      pendingTitle: 'Sending Message',
      pendingMessage: 'Processing your message...',
      successTitle: 'Message Sent',
      successMessage: 'Message processed successfully',
      errorTitle: 'Failed to Send Message',
      showToast: false // Don't show toast for chat messages
    }
  ),

  getProfiles: async (sessionId?: string): Promise<Profile[]> => {
    try {
      // Try both versions of the URL (with and without trailing slash)
      // This ensures it works in both Docker and CLI environments
      const urls = [
        `/api/chat/profiles${sessionId ? `?session_id=${sessionId}` : ''}`,
        `/api/chat/profiles/${sessionId ? `?session_id=${sessionId}` : ''}`
      ];
      
      let data = null;
      let error = null;
      
      // Try each URL until one works
      for (const url of urls) {
        try {
          console.log('Attempting to fetch profiles from:', url);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            data = await response.json();
            console.log('Profiles response from', url, ':', data);
            break; // Exit the loop if successful
          } else {
            console.log(`URL ${url} returned status ${response.status}`);
          }
        } catch (e) {
          error = e;
          console.log(`Error fetching from ${url}:`, e);
        }
      }
      
      // If we didn't get data from any URL, return empty array
      if (!data) {
        console.error('Failed to fetch profiles from any URL', error);
        return [];
      }
      
      // Handle both array response and ProfilesResponse object
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.profiles)) {
        return data.profiles;
      } else {
        console.error('Unexpected profiles response format:', data);
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
      // Build query parameters
      const params = new URLSearchParams();
      if (sessionId) params.append('session_id', sessionId);
      if (userName) params.append('user_id', userName);
      
      // Try both versions of the URL (with and without trailing slash)
      // This ensures it works in both Docker and CLI environments
      const urls = [
        `/api/chat/profiles/${profileId}${params.toString() ? `?${params.toString()}` : ''}`,
        `/api/chat/profiles/${profileId}/${params.toString() ? `?${params.toString()}` : ''}`
      ];
      
      let success = false;
      
      // Try each URL until one works
      for (const url of urls) {
        try {
          console.log('Attempting to set profile with:', url);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            console.log(`Successfully set profile using ${url}`);
            success = true;
            break; // Exit the loop if successful
          } else {
            console.log(`URL ${url} returned status ${response.status}`);
          }
        } catch (e) {
          console.log(`Error setting profile with ${url}:`, e);
        }
      }
      
      if (!success) {
        console.error('Failed to set profile with any URL');
      }
    } catch (error) {
      console.error('Error setting profile:', error);
      // Don't throw to prevent UI errors
    }
  },

  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      // Try both versions of the URL (with and without trailing slash)
      // This ensures it works in both Docker and CLI environments
      const urls = [
        `/api/chat/history?session_id=${sessionId}`,
        `/api/chat/history/?session_id=${sessionId}`
      ];
      
      let data = null;
      let error = null;
      
      // Try each URL until one works
      for (const url of urls) {
        try {
          console.log('Attempting to fetch chat history from:', url);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            data = await response.json();
            console.log('Chat history response from', url, ':', data);
            break; // Exit the loop if successful
          } else {
            console.log(`URL ${url} returned status ${response.status}`);
          }
        } catch (e) {
          error = e;
          console.log(`Error fetching from ${url}:`, e);
        }
      }
      
      // If we didn't get data from any URL, return empty array
      if (!data) {
        console.error('Failed to fetch chat history from any URL', error);
        return [];
      }
      
      // Process the data
      let messages: ChatMessage[] = [];
      
      if (Array.isArray(data)) {
        messages = data;
      } else if (data && data.messages && Array.isArray(data.messages)) {
        messages = data.messages;
      } else if (data && typeof data === 'object') {
        const possibleMessages = Object.values(data).find(val => Array.isArray(val));
        if (possibleMessages && Array.isArray(possibleMessages)) {
          messages = possibleMessages as ChatMessage[];
        }
      }
      
      // Filter out system messages
      return messages.filter(message => message.role !== 'system');
    } catch (error) {
      console.error('Error getting chat history:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  clearChatHistory: async (sessionId: string): Promise<void> => {
    try {
      // Try both versions of the URL (with and without trailing slash)
      // This ensures it works in both Docker and CLI environments
      const urls = [
        `/api/chat/history?session_id=${sessionId}`,
        `/api/chat/history/?session_id=${sessionId}`
      ];
      
      let success = false;
      
      // Try each URL until one works
      for (const url of urls) {
        try {
          console.log('Attempting to clear chat history with:', url);
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            console.log(`Successfully cleared chat history using ${url}`);
            success = true;
            break; // Exit the loop if successful
          } else {
            console.log(`URL ${url} returned status ${response.status}`);
          }
        } catch (e) {
          console.log(`Error clearing chat history with ${url}:`, e);
        }
      }
      
      if (!success) {
        console.error('Failed to clear chat history with any URL');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Don't throw to prevent UI errors
    }
  }
}; 