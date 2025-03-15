import React, { useState } from 'react';

interface AdvancedCrawlOptionsProps {
  followExternalLinks: boolean;
  setFollowExternalLinks: (value: boolean) => void;
  includePatterns: string;
  setIncludePatterns: (value: string) => void;
  excludePatterns: string;
  setExcludePatterns: (value: string) => void;
  headless: boolean;
  setHeadless: (value: boolean) => void;
  browserType: string;
  setBrowserType: (value: string) => void;
  javascriptEnabled: boolean;
  setJavascriptEnabled: (value: boolean) => void;
  userAgent: string;
  setUserAgent: (value: string) => void;
  timeout: number;
  setTimeout: (value: number) => void;
  waitForSelector: string;
  setWaitForSelector: (value: string) => void;
  downloadImages: boolean;
  setDownloadImages: (value: boolean) => void;
  downloadVideos: boolean;
  setDownloadVideos: (value: boolean) => void;
  downloadFiles: boolean;
  setDownloadFiles: (value: boolean) => void;
  followRedirects: boolean;
  setFollowRedirects: (value: boolean) => void;
  maxDepth: number;
  setMaxDepth: (value: number) => void;
  extractionType: string;
  setExtractionType: (value: string) => void;
  cssSelector: string;
  setCssSelector: (value: string) => void;
}

const AdvancedCrawlOptions: React.FC<AdvancedCrawlOptionsProps> = ({
  followExternalLinks,
  setFollowExternalLinks,
  includePatterns,
  setIncludePatterns,
  excludePatterns,
  setExcludePatterns,
  headless,
  setHeadless,
  browserType,
  setBrowserType,
  javascriptEnabled,
  setJavascriptEnabled,
  userAgent,
  setUserAgent,
  timeout,
  setTimeout,
  waitForSelector,
  setWaitForSelector,
  downloadImages,
  setDownloadImages,
  downloadVideos,
  setDownloadVideos,
  downloadFiles,
  setDownloadFiles,
  followRedirects,
  setFollowRedirects,
  maxDepth,
  setMaxDepth,
  extractionType,
  setExtractionType,
  cssSelector,
  setCssSelector,
}) => {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <div className="advanced-options-container">
      <div className="tabs flex border-b border-gray-300 dark:border-gray-600 mb-4">
        <button
          type="button"
          className={`py-2 px-4 ${
            activeTab === 'general'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${
            activeTab === 'browser'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('browser')}
        >
          Browser
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${
            activeTab === 'navigation'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('navigation')}
        >
          Navigation
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${
            activeTab === 'media'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('media')}
        >
          Media
        </button>
        <button
          type="button"
          className={`py-2 px-4 ${
            activeTab === 'extraction'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('extraction')}
        >
          Extraction
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="general-options">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="followExternalLinks"
                checked={followExternalLinks}
                onChange={(e) => setFollowExternalLinks(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="followExternalLinks" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Follow External Links
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, the crawler will follow links to external domains.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="includePatterns" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Include URL Patterns
            </label>
            <textarea
              id="includePatterns"
              value={includePatterns}
              onChange={(e) => setIncludePatterns(e.target.value)}
              placeholder="e.g. /blog/*, /docs/*"
              rows={2}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Comma-separated list of URL patterns to include. Use * as a wildcard.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="excludePatterns" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Exclude URL Patterns
            </label>
            <textarea
              id="excludePatterns"
              value={excludePatterns}
              onChange={(e) => setExcludePatterns(e.target.value)}
              placeholder="e.g. /admin/*, /login/*"
              rows={2}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Comma-separated list of URL patterns to exclude. Use * as a wildcard.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="followRedirects"
                checked={followRedirects}
                onChange={(e) => setFollowRedirects(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="followRedirects" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Follow Redirects
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, the crawler will follow HTTP redirects.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="maxDepth" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Max Crawl Depth
            </label>
            <input
              type="number"
              id="maxDepth"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              min={1}
              max={10}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum depth for crawling (1-10). Higher values will crawl more pages but take longer.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'browser' && (
        <div className="browser-options">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="headless"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="headless" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Headless Mode
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, the browser will run in headless mode (no visible UI).
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="browserType" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Browser Type
            </label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="chromium">Chromium</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">WebKit</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The type of browser to use for crawling.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="javascriptEnabled"
                checked={javascriptEnabled}
                onChange={(e) => setJavascriptEnabled(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="javascriptEnabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                JavaScript Enabled
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, JavaScript will be executed on the page.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="userAgent" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              User Agent
            </label>
            <input
              type="text"
              id="userAgent"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Custom user agent string. Leave empty to use the default.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'navigation' && (
        <div className="navigation-options">
          <div className="mb-4">
            <label htmlFor="timeout" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Page Load Timeout (ms)
            </label>
            <input
              type="number"
              id="timeout"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value))}
              min={1000}
              max={60000}
              step={1000}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum time to wait for a page to load (in milliseconds).
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="waitForSelector" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Wait For Selector
            </label>
            <input
              type="text"
              id="waitForSelector"
              value={waitForSelector}
              onChange={(e) => setWaitForSelector(e.target.value)}
              placeholder="e.g. #content, .main-content"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              CSS selector to wait for before considering the page loaded.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'media' && (
        <div className="media-options">
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="downloadImages"
                checked={downloadImages}
                onChange={(e) => setDownloadImages(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="downloadImages" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Download Images
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, images will be downloaded during crawling.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="downloadVideos"
                checked={downloadVideos}
                onChange={(e) => setDownloadVideos(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="downloadVideos" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Download Videos
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, videos will be downloaded during crawling.
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="downloadFiles"
                checked={downloadFiles}
                onChange={(e) => setDownloadFiles(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="downloadFiles" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Download Files
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If enabled, files (PDFs, DOCs, etc.) will be downloaded during crawling.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'extraction' && (
        <div className="extraction-options">
          <div className="mb-4">
            <label htmlFor="extractionType" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Extraction Type
            </label>
            <select
              id="extractionType"
              value={extractionType}
              onChange={(e) => setExtractionType(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="basic">Basic</option>
              <option value="article">Article</option>
              <option value="custom">Custom</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The type of content extraction to use.
            </p>
          </div>

          {extractionType === 'custom' && (
            <div className="mb-4">
              <label htmlFor="cssSelector" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                CSS Selector
              </label>
              <input
                type="text"
                id="cssSelector"
                value={cssSelector}
                onChange={(e) => setCssSelector(e.target.value)}
                placeholder="e.g. #content, .main-content"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                CSS selector for content extraction. Only used when extraction type is 'custom'.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedCrawlOptions; 