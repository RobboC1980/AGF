# Auth Schema Execution Order

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
Your database URL from .env: `Not found`
