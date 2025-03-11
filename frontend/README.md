# Supa Crawl Chat Frontend

A modern React frontend for the Supa Crawl Chat application. This UI provides a user-friendly interface to interact with the Supa Crawl Chat API, allowing you to crawl websites, search content, and chat with your data using AI.

## Features

- **Modern React with TypeScript**: Built with React 18 and TypeScript for type safety
- **Vite**: Fast development server and optimized builds
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Dark Mode**: Full dark mode support with system preference detection
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **API Integration**: Seamless integration with the Supa Crawl Chat API

## Pages

- **Home**: Overview of the application features
- **Chat**: Interactive chat interface to query your crawled data
- **Crawl**: Form to start new crawls of websites or sitemaps
- **Search**: Search interface to find content in your crawled data
- **Sites**: List of crawled sites with details and statistics
- **Site Detail**: Detailed view of a specific site with its pages

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to http://localhost:3000

### Building for Production

```bash
npm run build
# or
yarn build
```

The build output will be in the `dist` directory.

## Project Structure

```
frontend/
├── public/            # Static assets
├── src/
│   ├── api/           # API service and types
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── styles/        # Global styles and Tailwind config
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main App component with routing
│   └── main.tsx       # Entry point
├── index.html         # HTML template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## Development

### API Integration

The frontend is configured to proxy API requests to the backend server. In development mode, all requests to `/api/*` are forwarded to `http://localhost:8001`.

### Environment Variables

You can customize the API URL by creating a `.env.local` file:

```
VITE_API_URL=http://your-api-url
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes: `git commit -m 'Add my feature'`
3. Push to the branch: `git push origin feature/my-feature`
4. Submit a pull request 