#!/bin/bash

# AgileForge Supabase Migration Helper Script
# This script helps automate common migration tasks

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AgileForge Supabase Migration Helper ===${NC}"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed.${NC}"
    echo "Please install it with: npm install -g supabase"
    exit 1
fi

# Check if necessary environment variables are set
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    read -p "Enter your Supabase project ID: " SUPABASE_PROJECT_ID
fi

echo -e "\n${BLUE}Setting up dependencies...${NC}"
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared

# Copy environment variables
echo -e "\n${BLUE}Setting up environment variables...${NC}"
if [ -f ".env.local.supabase" ]; then
    cp .env.local.supabase .env.local
    echo -e "${GREEN}Copied .env.local.supabase to .env.local${NC}"
    echo "Please update the values in .env.local with your Supabase project details."
else
    echo -e "${RED}Warning: .env.local.supabase not found${NC}"
    echo "Please create and configure .env.local manually."
fi

# Setup Supabase CLI
echo -e "\n${BLUE}Setting up Supabase project...${NC}"
if [ ! -d "supabase" ]; then
    echo "Initializing Supabase project..."
    supabase init
    echo -e "${GREEN}Supabase project initialized${NC}"
else
    echo "Supabase project directory already exists."
fi

# Create Edge Functions directory if it doesn't exist
if [ ! -d "supabase/functions/ai" ]; then
    echo "Creating AI Edge Function directory..."
    mkdir -p supabase/functions/ai
fi

# Copy AI function
echo -e "\n${BLUE}Setting up AI Edge Function...${NC}"
if [ -f "supabase_migration/ai_function.ts" ]; then
    cp supabase_migration/ai_function.ts supabase/functions/ai/index.ts
    echo -e "${GREEN}Copied AI function to supabase/functions/ai/index.ts${NC}"
else
    echo -e "${RED}Warning: ai_function.ts not found${NC}"
fi

# Setup instructions
echo -e "\n${GREEN}=== Migration Setup Complete ===${NC}"
echo -e "Next steps:"
echo -e "1. Update ${BLUE}.env.local${NC} with your Supabase project details"
echo -e "2. Run the SQL migration script in your Supabase dashboard"
echo -e "   - Go to SQL Editor in the Supabase dashboard"
echo -e "   - Copy and paste the contents of ${BLUE}supabase_migration/schema.sql${NC}"
echo -e "   - Execute the script"
echo -e "3. Deploy the AI Edge Function:"
echo -e "   ${BLUE}supabase functions deploy ai${NC}"
echo -e "4. Set the OpenAI API key for the function:"
echo -e "   ${BLUE}supabase secrets set OPENAI_API_KEY=your-openai-api-key${NC}"
echo -e "5. Update your frontend components to use the Supabase client"
echo -e "\nFor detailed instructions, refer to the ${BLUE}IMPLEMENTATION_GUIDE.md${NC} file."

echo -e "\n${GREEN}Good luck with your migration!${NC}" 