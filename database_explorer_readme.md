# Supabase Database Explorer Tools

This directory contains tools to help you explore and analyze your Supabase database for the Supa-Crawl-Chat project. These tools provide a Jupyter Notebook-like experience for running SQL queries and visualizing the results.

## Available Tools

1. **Jupyter Notebook (`supabase_explorer.ipynb`)**: A Jupyter notebook that connects to your Supabase database and allows you to run SQL queries interactively.

2. **Streamlit App (`supabase_explorer.py`)**: A web-based interface for running predefined and custom SQL queries, with visualization capabilities.

3. **SQL Queries Collection (`supabase_queries.md`)**: A collection of useful SQL queries organized by category.

## Setup Instructions

### Prerequisites

- Python 3.8+
- Your `.env` file with Supabase database credentials

### Installation

1. Install the required packages:

```bash
pip install sqlalchemy psycopg2-binary pandas python-dotenv matplotlib seaborn streamlit jupyter notebook
```

2. Make sure your `.env` file contains the following variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_DB=postgres
SUPABASE_KEY=postgres
SUPABASE_PASSWORD=postgres
```

## Using the Jupyter Notebook

1. Start Jupyter Notebook:

```bash
jupyter notebook
```

2. Open `supabase_explorer.ipynb`

3. Run the cells one by one to:
   - Connect to your database
   - Run predefined queries
   - Visualize the results
   - Create your own custom queries

The notebook automatically loads your database credentials from the `.env` file and provides a set of example queries to get you started.

## Using the Streamlit App

1. Run the Streamlit app:

```bash
streamlit run supabase_explorer.py
```

2. The app will open in your browser with three tabs:
   - **Predefined Queries**: Run queries from the `supabase_queries.md` file
   - **Custom Query**: Write and run your own SQL queries
   - **Database Overview**: View statistics about your database

3. Features:
   - Edit queries before running them
   - Visualize results with bar charts, line charts, or pie charts
   - Download results as CSV files
   - View database statistics and site information

## Benefits

- **Interactive**: Run queries with a single click, just like in a Jupyter notebook
- **Visual**: See your data in tables and charts
- **Convenient**: No need to copy-paste queries into a separate SQL client
- **Organized**: Predefined queries are categorized for easy access
- **Customizable**: Edit queries on the fly to suit your needs
- **Shareable**: Export results as CSV files

## Troubleshooting

- **Connection Issues**: Make sure your `.env` file has the correct database credentials
- **Missing Tables**: Ensure you've run the database setup script for Supa-Crawl-Chat
- **Package Errors**: Install any missing packages with `pip install`

## Adding Your Own Queries

To add your own queries to the predefined list:

1. Edit the `supabase_queries.md` file
2. Follow the existing format:
   ```markdown
   ## Your Category
   
   ### Your Query Name
   
   ```sql
   SELECT * FROM your_table WHERE your_condition;
   ```
   ```

3. Restart the Streamlit app to load the new queries 