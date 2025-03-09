import streamlit as st
import pandas as pd
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import matplotlib.pyplot as plt
import seaborn as sns
import json

# Set page title and layout
st.set_page_config(
    page_title="Supabase Explorer",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state for storing query results
if 'query_results' not in st.session_state:
    st.session_state.query_results = None
if 'current_query' not in st.session_state:
    st.session_state.current_query = None
if 'current_section' not in st.session_state:
    st.session_state.current_section = None
if 'current_query_name' not in st.session_state:
    st.session_state.current_query_name = None

# Load environment variables
load_dotenv()

# Get database connection details from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_DB = os.getenv("SUPABASE_DB", "postgres")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "postgres")
SUPABASE_PASSWORD = os.getenv("SUPABASE_PASSWORD", "postgres")

# Parse the URL to get host and port
if "://" in SUPABASE_URL:
    # URL with protocol
    from urllib.parse import urlparse
    parsed_url = urlparse(SUPABASE_URL)
    host = parsed_url.hostname
    port = parsed_url.port or 5432
else:
    # URL without protocol
    parts = SUPABASE_URL.split(":")
    host = parts[0]
    port = int(parts[1]) if len(parts) > 1 else 5432

# Create connection string
connection_string = f"postgresql://{SUPABASE_KEY}:{SUPABASE_PASSWORD}@{host}:{port}/{SUPABASE_DB}"

# Create engine
@st.cache_resource
def get_engine():
    return create_engine(connection_string)

# Function to run a query
def run_query(query, params=None):
    engine = get_engine()
    try:
        with engine.connect() as conn:
            if params:
                result = conn.execute(text(query), params)
            else:
                result = conn.execute(text(query))
            return pd.DataFrame(result.fetchall(), columns=result.keys())
    except Exception as e:
        st.error(f"Error executing query: {e}")
        return None

# Load queries from the markdown file
def load_queries_from_md(file_path=None):
    try:
        # If no file path is provided, use the default path
        if file_path is None:
            # Try to find the file in the current directory
            if os.path.exists("supabase_queries.md"):
                file_path = "supabase_queries.md"
            # Try to find the file in the parent directory
            elif os.path.exists("../supabase_queries.md"):
                file_path = "../supabase_queries.md"
            # Try to find the file in the supabase_explorer directory
            elif os.path.exists(os.path.join(os.path.dirname(__file__), "supabase_queries.md")):
                file_path = os.path.join(os.path.dirname(__file__), "supabase_queries.md")
            else:
                st.error("Could not find supabase_queries.md file. Please provide the path to the file.")
                return {}
        
        st.info(f"Loading queries from {file_path}")
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Parse the markdown to extract queries
        queries = {}
        current_section = None
        current_query_name = None
        current_query = ""
        in_code_block = False
        
        for line in content.split('\n'):
            if line.startswith('## '):
                current_section = line[3:].strip()
                queries[current_section] = {}
            elif line.startswith('### '):
                current_query_name = line[4:].strip()
                if current_section:
                    queries[current_section][current_query_name] = ""
            elif line.startswith('```sql'):
                in_code_block = True
            elif line.startswith('```') and in_code_block:
                in_code_block = False
                if current_section and current_query_name:
                    queries[current_section][current_query_name] = current_query.strip()
                current_query = ""
            elif in_code_block:
                current_query += line + "\n"
        
        return queries
    except Exception as e:
        st.error(f"Error loading queries: {e}")
        return {}

# Main app
def main():
    st.title("Supabase Database Explorer")
    
    # Sidebar
    st.sidebar.header("Connection Info")
    st.sidebar.text(f"Host: {host}")
    st.sidebar.text(f"Port: {port}")
    st.sidebar.text(f"Database: {SUPABASE_DB}")
    
    # Add file path selector
    st.sidebar.header("Settings")
    queries_file = st.sidebar.text_input("Path to queries file", "supabase_queries.md")
    
    # Test connection
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            st.sidebar.success("✅ Connected to database")
    except Exception as e:
        st.sidebar.error(f"❌ Connection failed: {e}")
        st.stop()
    
    # Load queries
    queries = load_queries_from_md(queries_file)
    
    # Create tabs
    tab1, tab2, tab3 = st.tabs(["Predefined Queries", "Custom Query", "Database Overview"])
    
    # Tab 1: Predefined Queries
    with tab1:
        # Select section
        if queries:
            section = st.selectbox("Select a category", list(queries.keys()), key="section_selector")
            st.session_state.current_section = section
            
            # Select query
            if section:
                query_name = st.selectbox("Select a query", list(queries[section].keys()), key="query_selector")
                st.session_state.current_query_name = query_name
                
                # Display and edit query
                if query_name:
                    query = queries[section][query_name]
                    edited_query = st.text_area("SQL Query", query, height=200, key="query_editor")
                    st.session_state.current_query = edited_query
                    
                    # Run query button
                    if st.button("Run Query", key="run_query_button"):
                        with st.spinner("Running query..."):
                            df = run_query(edited_query)
                            if df is not None:
                                st.session_state.query_results = df
                    
                    # Display results if available
                    if st.session_state.query_results is not None:
                        df = st.session_state.query_results
                        st.success(f"Query returned {len(df)} rows")
                        st.dataframe(df)
                        
                        # Download button
                        csv = df.to_csv(index=False).encode('utf-8')
                        st.download_button(
                            "Download as CSV",
                            csv,
                            f"{query_name.replace(' ', '_')}.csv",
                            "text/csv",
                            key=f"download_{section}_{query_name}"
                        )
                        
                        # Visualization options
                        if len(df) > 0 and len(df.columns) > 1:
                            st.subheader("Visualization")
                            
                            # Create a container for all controls
                            controls_container = st.container()
                            
                            with controls_container:
                                # Create three columns for the controls to keep them compact
                                viz_col1, viz_col2, viz_col3 = st.columns(3)
                                
                                with viz_col1:
                                    viz_type = st.selectbox(
                                        "Select visualization type",
                                        ["None", "Bar Chart", "Line Chart", "Pie Chart"],
                                        key=f"viz_type"
                                    )
                                
                                if viz_type != "None":
                                    with viz_col2:
                                        x_col = st.selectbox("X-axis", df.columns, key=f"x_axis")
                                    with viz_col3:
                                        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                                        if numeric_cols:
                                            y_col = st.selectbox("Y-axis", numeric_cols, key=f"y_axis")
                            
                            # Only proceed with chart if we have all necessary selections
                            if viz_type != "None" and 'numeric_cols' in locals() and numeric_cols:
                                # Clear separation between controls and chart
                                st.markdown("<hr style='margin: 1em 0; clear: both;'>", unsafe_allow_html=True)
                                
                                # Create visualization in full width container
                                st.subheader(f"Chart: {query_name}")
                                
                                # Create a container that takes up the full width
                                chart_container = st.container()
                                
                                with chart_container:
                                    # Create a larger figure with wider dimensions
                                    # Use even larger dimensions for pie charts
                                    if viz_type == "Pie Chart":
                                        fig, ax = plt.subplots(figsize=(20, 16))
                                    else:
                                        fig, ax = plt.subplots(figsize=(16, 10))
                                    
                                    try:
                                        if viz_type == "Bar Chart":
                                            df.set_index(x_col)[y_col].plot(kind='bar', ax=ax)
                                            plt.xticks(rotation=45, ha='right')
                                        elif viz_type == "Line Chart":
                                            df.set_index(x_col)[y_col].plot(kind='line', ax=ax)
                                            plt.xticks(rotation=45, ha='right')
                                        elif viz_type == "Pie Chart":
                                            # For pie charts, use a larger font size and adjust the layout
                                            df.set_index(x_col)[y_col].plot(kind='pie', ax=ax, autopct='%1.1f%%', textprops={'fontsize': 12})
                                            plt.legend(fontsize=12, loc='best')
                                        
                                        plt.title(f"{query_name}", fontsize=18)
                                        plt.xlabel(x_col, fontsize=14)
                                        plt.ylabel(y_col, fontsize=14)
                                        plt.tight_layout(pad=3.0)  # Add more padding
                                        
                                        # Use the full width of the page for the chart
                                        st.pyplot(fig, use_container_width=True)
                                    except KeyError as e:
                                        st.error(f"Error: Column not found. Please select different columns for visualization. Details: {e}")
                                    except ValueError as e:
                                        st.error(f"Error: Invalid data for this chart type. Try a different chart type or columns. Details: {e}")
                                    except Exception as e:
                                        st.error(f"Error creating visualization: {e}")
                                        st.info("Tip: For bar and pie charts, try selecting a column with fewer unique values for the X-axis.")
        else:
            st.warning("No queries found. Make sure the supabase_queries.md file exists in the same directory.")
    
    # Tab 2: Custom Query
    with tab2:
        st.subheader("Run a custom SQL query")
        
        # Initialize session state for custom query
        if 'custom_query' not in st.session_state:
            st.session_state.custom_query = ""
        if 'custom_query_results' not in st.session_state:
            st.session_state.custom_query_results = None
            
        # Custom query input
        custom_query = st.text_area("Enter your SQL query", st.session_state.custom_query, height=200, key="custom_query_input")
        st.session_state.custom_query = custom_query
        
        # Run custom query button
        if st.button("Run Custom Query", key="run_custom_query_button"):
            if custom_query:
                with st.spinner("Running query..."):
                    df = run_query(custom_query)
                    if df is not None:
                        st.session_state.custom_query_results = df
            else:
                st.warning("Please enter a query")
                
        # Display custom query results if available
        if st.session_state.custom_query_results is not None:
            df = st.session_state.custom_query_results
            st.success(f"Query returned {len(df)} rows")
            st.dataframe(df)
            
            # Download button
            csv = df.to_csv(index=False).encode('utf-8')
            st.download_button(
                "Download as CSV",
                csv,
                "custom_query_result.csv",
                "text/csv",
                key="download_custom"
            )
            
            # Visualization options
            if len(df) > 0 and len(df.columns) > 1:
                st.subheader("Visualization")
                
                # Create a container for all controls
                controls_container = st.container()
                
                with controls_container:
                    # Create three columns for the controls to keep them compact
                    viz_col1, viz_col2, viz_col3 = st.columns(3)
                    
                    with viz_col1:
                        viz_type = st.selectbox(
                            "Select visualization type",
                            ["None", "Bar Chart", "Line Chart", "Pie Chart"],
                            key="custom_viz_type"
                        )
                    
                    if viz_type != "None":
                        with viz_col2:
                            x_col = st.selectbox("X-axis", df.columns, key="custom_x_axis")
                        with viz_col3:
                            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                            if numeric_cols:
                                y_col = st.selectbox("Y-axis", numeric_cols, key="custom_y_axis")
                
                # Only proceed with chart if we have all necessary selections
                if viz_type != "None" and 'numeric_cols' in locals() and numeric_cols:
                    # Clear separation between controls and chart
                    st.markdown("<hr style='margin: 1em 0; clear: both;'>", unsafe_allow_html=True)
                    
                    # Create visualization in full width container
                    st.subheader("Chart: Custom Query Results")
                    
                    # Create a container that takes up the full width
                    chart_container = st.container()
                    
                    with chart_container:
                        # Create a larger figure with wider dimensions
                        # Use even larger dimensions for pie charts
                        if viz_type == "Pie Chart":
                            fig, ax = plt.subplots(figsize=(20, 16))
                        else:
                            fig, ax = plt.subplots(figsize=(16, 10))
                        
                        try:
                            if viz_type == "Bar Chart":
                                df.set_index(x_col)[y_col].plot(kind='bar', ax=ax)
                                plt.xticks(rotation=45, ha='right')
                            elif viz_type == "Line Chart":
                                df.set_index(x_col)[y_col].plot(kind='line', ax=ax)
                                plt.xticks(rotation=45, ha='right')
                            elif viz_type == "Pie Chart":
                                # For pie charts, use a larger font size and adjust the layout
                                df.set_index(x_col)[y_col].plot(kind='pie', ax=ax, autopct='%1.1f%%', textprops={'fontsize': 12})
                                plt.legend(fontsize=12, loc='best')
                            
                            plt.title("Custom Query Results", fontsize=18)
                            plt.xlabel(x_col, fontsize=14)
                            plt.ylabel(y_col, fontsize=14)
                            plt.tight_layout(pad=3.0)  # Add more padding
                            
                            # Use the full width of the page for the chart
                            st.pyplot(fig, use_container_width=True)
                        except KeyError as e:
                            st.error(f"Error: Column not found. Please select different columns for visualization. Details: {e}")
                        except ValueError as e:
                            st.error(f"Error: Invalid data for this chart type. Try a different chart type or columns. Details: {e}")
                        except Exception as e:
                            st.error(f"Error creating visualization: {e}")
                            st.info("Tip: For bar and pie charts, try selecting a column with fewer unique values for the X-axis.")
                        else:
                            st.warning("No numeric columns available for visualization")
    
    # Tab 3: Database Overview
    with tab3:
        st.subheader("Database Overview")
        
        # Get database statistics
        stats_query = """
        SELECT 
          'Sites' as type, 
          COUNT(*) as count 
        FROM 
          crawl_sites 
        UNION ALL 
        SELECT 
          'Parent Pages' as type, 
          COUNT(*) as count 
        FROM 
          crawl_pages 
        WHERE 
          is_chunk = false 
        UNION ALL 
        SELECT 
          'Chunks' as type, 
          COUNT(*) as count 
        FROM 
          crawl_pages 
        WHERE 
          is_chunk = true 
        UNION ALL 
        SELECT 
          'Conversations' as type, 
          COUNT(DISTINCT session_id) as count 
        FROM 
          chat_conversations;
        """
        
        with st.spinner("Loading database statistics..."):
            stats_df = run_query(stats_query)
            if stats_df is not None:
                # Display stats
                col1, col2 = st.columns(2)
                with col1:
                    st.dataframe(stats_df, use_container_width=True)
                with col2:
                    # Create a container for the chart
                    chart_container = st.container()
                    
                    with chart_container:
                        fig, ax = plt.subplots(figsize=(14, 10))
                        stats_df.set_index('type')['count'].plot(kind='bar', ax=ax)
                        plt.title('Database Statistics', fontsize=18)
                        plt.xlabel('Type', fontsize=14)
                        plt.ylabel('Count', fontsize=14)
                        plt.xticks(rotation=45, fontsize=12)
                        plt.yticks(fontsize=12)
                        plt.tight_layout(pad=3.0)
                        st.pyplot(fig, use_container_width=True)
        
        # Get sites with page counts
        sites_query = """
        SELECT 
          s.id, 
          s.name, 
          s.url, 
          COUNT(p.id) FILTER (WHERE p.is_chunk = false) as parent_pages,
          COUNT(p.id) FILTER (WHERE p.is_chunk = true) as chunks,
          COUNT(p.id) as total_pages
        FROM 
          crawl_sites s 
        LEFT JOIN 
          crawl_pages p ON s.id = p.site_id 
        GROUP BY 
          s.id, s.name, s.url
        ORDER BY 
          total_pages DESC;
        """
        
        with st.spinner("Loading site statistics..."):
            sites_df = run_query(sites_query)
            if sites_df is not None:
                st.subheader("Sites Overview")
                st.dataframe(sites_df, use_container_width=True)
                
                # Plot site statistics
                if len(sites_df) > 0:
                    # Create a container for the chart
                    chart_container = st.container()
                    
                    with chart_container:
                        fig, ax = plt.subplots(figsize=(20, 12))
                        sites_df.set_index('name')[['parent_pages', 'chunks']].head(10).plot(kind='bar', stacked=True, ax=ax)
                        plt.title('Page Counts by Site (Top 10)', fontsize=18)
                        plt.xlabel('Site', fontsize=14)
                        plt.ylabel('Count', fontsize=14)
                        plt.xticks(rotation=45, ha='right', fontsize=12)
                        plt.yticks(fontsize=12)
                        plt.legend(fontsize=12)
                        plt.tight_layout(pad=3.0)
                        st.pyplot(fig, use_container_width=True)

if __name__ == "__main__":
    main() 