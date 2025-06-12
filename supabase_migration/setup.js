// Supabase Migration Setup
// This file contains the steps to set up your Supabase project

const steps = {
  setup: [
    "1. Sign up for Supabase at https://supabase.com if you haven't already",
    "2. Create a new project in Supabase",
    "3. Note your project URL and anon key (will be used in environment variables)",
    "4. Run the schema migration script provided in schema.sql"
  ],
  
  environmentSetup: [
    "Create a .env.local.supabase file with the following variables:",
    "NEXT_PUBLIC_SUPABASE_URL=your-project-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for admin operations)",
  ],
  
  dependencies: [
    "@supabase/supabase-js",
    "@supabase/auth-helpers-nextjs",
    "@supabase/auth-ui-react",
    "@supabase/auth-ui-shared"
  ]
};

console.log("AgileForge Supabase Migration Setup");
console.log("===================================");
console.log("\nFollow these steps to set up your Supabase project:\n");
steps.setup.forEach((step, i) => console.log(step));
console.log("\nEnvironment Variables:\n");
steps.environmentSetup.forEach(step => console.log(step));
console.log("\nRequired NPM dependencies:\n");
console.log("npm install " + steps.dependencies.join(" ")); 