#!/usr/bin/env python3
"""
Alternative script to run the auth schema.
This script can either:
1. Output the SQL for manual execution
2. Run against a local PostgreSQL instance
3. Split the schema into smaller chunks for easier execution
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def split_sql_statements(sql_content):
    """Split SQL content into individual statements"""
    # Split by semicolon but be careful with function definitions
    statements = []
    current_statement = ""
    in_function = False
    
    lines = sql_content.split('\n')
    for line in lines:
        line = line.strip()
        
        # Skip empty lines and comments
        if not line or line.startswith('--'):
            continue
            
        # Check for function start
        if 'CREATE OR REPLACE FUNCTION' in line.upper() or 'CREATE FUNCTION' in line.upper():
            in_function = True
        
        current_statement += line + '\n'
        
        # Check for statement end
        if line.endswith(';'):
            if in_function and ('END;' in line.upper() or '$$ LANGUAGE' in line.upper()):
                in_function = False
                statements.append(current_statement.strip())
                current_statement = ""
            elif not in_function:
                statements.append(current_statement.strip())
                current_statement = ""
    
    # Add any remaining statement
    if current_statement.strip():
        statements.append(current_statement.strip())
    
    return statements

def output_sql_file():
    """Output the SQL content for manual execution"""
    backend_dir = Path(__file__).parent.parent
    schema_file = backend_dir / "database" / "auth_schema.sql"
    
    if not schema_file.exists():
        logger.error(f"Auth schema file not found: {schema_file}")
        return False
    
    logger.info("📄 Reading auth schema file...")
    with open(schema_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Create output directory
    output_dir = backend_dir / "scripts" / "sql_output"
    output_dir.mkdir(exist_ok=True)
    
    # Write full schema
    full_output = output_dir / "full_auth_schema.sql"
    with open(full_output, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    logger.info(f"✅ Full schema written to: {full_output}")
    
    # Split into smaller files
    statements = split_sql_statements(sql_content)
    logger.info(f"📝 Split into {len(statements)} statements")
    
    # Group statements by type
    groups = {
        'extensions': [],
        'tables': [],
        'indexes': [],
        'functions': [],
        'triggers': [],
        'data': [],
        'views': []
    }
    
    for stmt in statements:
        stmt_upper = stmt.upper()
        if 'CREATE EXTENSION' in stmt_upper:
            groups['extensions'].append(stmt)
        elif 'CREATE TABLE' in stmt_upper:
            groups['tables'].append(stmt)
        elif 'CREATE INDEX' in stmt_upper:
            groups['indexes'].append(stmt)
        elif 'CREATE OR REPLACE FUNCTION' in stmt_upper or 'CREATE FUNCTION' in stmt_upper:
            groups['functions'].append(stmt)
        elif 'CREATE TRIGGER' in stmt_upper:
            groups['triggers'].append(stmt)
        elif 'INSERT INTO' in stmt_upper:
            groups['data'].append(stmt)
        elif 'CREATE OR REPLACE VIEW' in stmt_upper or 'CREATE VIEW' in stmt_upper:
            groups['views'].append(stmt)
        else:
            groups['data'].append(stmt)  # Default to data
    
    # Write grouped files
    for group_name, statements in groups.items():
        if statements:
            group_file = output_dir / f"{group_name}.sql"
            with open(group_file, 'w', encoding='utf-8') as f:
                f.write(f"-- {group_name.upper()} STATEMENTS\n\n")
                for stmt in statements:
                    f.write(stmt + '\n\n')
            logger.info(f"✅ {group_name.capitalize()} statements written to: {group_file}")
    
    # Create execution order file
    order_file = output_dir / "execution_order.md"
    with open(order_file, 'w', encoding='utf-8') as f:
        f.write("""# Auth Schema Execution Order

To manually execute the auth schema, run the SQL files in this order:

1. **extensions.sql** - PostgreSQL extensions
2. **tables.sql** - All table definitions
3. **indexes.sql** - Database indexes
4. **functions.sql** - Stored procedures and functions
5. **triggers.sql** - Database triggers
6. **views.sql** - Database views
7. **data.sql** - Initial data (roles, permissions, etc.)

## Manual Execution Commands

```bash
# Using psql command line:
psql "your_database_url" -f extensions.sql
psql "your_database_url" -f tables.sql
psql "your_database_url" -f indexes.sql
psql "your_database_url" -f functions.sql
psql "your_database_url" -f triggers.sql
psql "your_database_url" -f views.sql
psql "your_database_url" -f data.sql
```

## Or execute the full schema at once:
```bash
psql "your_database_url" -f full_auth_schema.sql
```

## Database Connection String
Your database URL from .env: `{}`
""".format(os.getenv("DATABASE_URL", "Not found")))
    
    logger.info(f"✅ Execution instructions written to: {order_file}")
    
    return True

async def try_local_execution():
    """Try to execute against a local PostgreSQL instance"""
    try:
        import asyncpg
        
        # Try common local PostgreSQL connections
        local_urls = [
            "postgresql://postgres:postgres@localhost:5432/agileforge",
            "postgresql://postgres@localhost:5432/agileforge",
            "postgresql://localhost:5432/agileforge"
        ]
        
        for url in local_urls:
            try:
                logger.info(f"Trying local connection: {url}")
                conn = await asyncpg.connect(url)
                
                # Test connection
                await conn.fetchval("SELECT 1")
                logger.info("✅ Local PostgreSQL connection successful!")
                
                # Ask user if they want to proceed
                response = input("Do you want to run the auth schema on this local database? (y/N): ")
                if response.lower() == 'y':
                    # Run the schema
                    backend_dir = Path(__file__).parent.parent
                    schema_file = backend_dir / "database" / "auth_schema.sql"
                    
                    with open(schema_file, 'r', encoding='utf-8') as f:
                        sql_content = f.read()
                    
                    await conn.execute(sql_content)
                    logger.info("✅ Auth schema executed successfully on local database!")
                    
                await conn.close()
                return True
                
            except Exception as e:
                logger.debug(f"Local connection failed: {e}")
                continue
        
        logger.warning("No local PostgreSQL instance found")
        return False
        
    except ImportError:
        logger.warning("asyncpg not available for local execution")
        return False

def main():
    """Main function"""
    logger.info("🚀 Auth Schema Deployment Tool")
    logger.info("=" * 50)
    
    print("\nOptions:")
    print("1. Output SQL files for manual execution")
    print("2. Try local PostgreSQL execution")
    print("3. Both")
    
    choice = input("\nChoose an option (1-3): ").strip()
    
    if choice in ['1', '3']:
        logger.info("\n📄 Generating SQL files...")
        success = output_sql_file()
        if success:
            logger.info("✅ SQL files generated successfully!")
            logger.info("Check the backend/scripts/sql_output/ directory")
        else:
            logger.error("❌ Failed to generate SQL files")
    
    if choice in ['2', '3']:
        logger.info("\n🔍 Checking for local PostgreSQL...")
        try:
            asyncio.run(try_local_execution())
        except Exception as e:
            logger.error(f"Local execution failed: {e}")
    
    logger.info("\n🎉 Done!")

if __name__ == "__main__":
    main() 