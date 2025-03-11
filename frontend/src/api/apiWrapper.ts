import { apiService } from './apiService';
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

  getProfiles: (sessionId?: string) => trackApiCall(
    apiService.getProfiles(sessionId),
    {
      pendingTitle: 'Loading Profiles',
      pendingMessage: 'Fetching available profiles...',
      successTitle: 'Profiles Loaded',
      successMessage: 'Successfully loaded profiles',
      errorTitle: 'Failed to Load Profiles',
      showToast: false
    }
  ),

  setProfile: (profileId: string, sessionId?: string, userName?: string) => trackApiCall(
    apiService.setProfile(profileId, sessionId, userName),
    {
      pendingTitle: 'Setting Profile',
      pendingMessage: `Setting active profile to ${profileId}...`,
      successTitle: 'Profile Set',
      successMessage: `Successfully set profile to ${profileId}`,
      errorTitle: 'Failed to Set Profile',
      showToast: true
    }
  ),

  getChatHistory: (sessionId: string) => trackApiCall(
    apiService.getChatHistory(sessionId),
    {
      pendingTitle: 'Loading Chat History',
      pendingMessage: 'Fetching chat history...',
      successTitle: 'Chat History Loaded',
      successMessage: 'Successfully loaded chat history',
      errorTitle: 'Failed to Load Chat History',
      showToast: false
    }
  ),

  clearChatHistory: (sessionId: string) => trackApiCall(
    apiService.clearChatHistory(sessionId),
    {
      pendingTitle: 'Clearing Chat History',
      pendingMessage: 'Clearing chat history...',
      successTitle: 'Chat History Cleared',
      successMessage: 'Successfully cleared chat history',
      errorTitle: 'Failed to Clear Chat History',
      showToast: true
    }
  )
}; 