import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  try {
    // Create a browser instance for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    
    // Wait for frontend
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
      console.log('✅ Frontend is ready');
    } catch (error) {
      console.log('⚠️ Frontend not ready, continuing...');
    }

    // Wait for backend
    try {
      const response = await page.request.get('http://localhost:8000/health');
      if (response.ok()) {
        console.log('✅ Backend is ready');
      } else {
        console.log('⚠️ Backend health check failed');
      }
    } catch (error) {
      console.log('⚠️ Backend not ready, continuing...');
    }

    // Setup test data if needed
    await setupTestData(page);

    // Create authenticated session for tests
    await createAuthenticatedSession(page);

    await browser.close();
    console.log('✅ E2E setup completed');
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  }
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  // This would typically create test users, projects, etc.
  // For now, we'll just verify the backend is responding
  try {
    const response = await page.request.get('http://localhost:8000/api/ai/health');
    if (response.ok()) {
      console.log('✅ Test data setup verified');
    }
  } catch (error) {
    console.log('⚠️ Test data setup warning:', error);
  }
}

async function createAuthenticatedSession(page: any) {
  console.log('🔐 Creating authenticated session...');
  
  try {
    // This would typically log in a test user
    // For now, we'll store a mock session
    await page.goto('http://localhost:3000');
    
    // Store test authentication state
    await page.context().storageState({ path: './e2e/auth-state.json' });
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.log('⚠️ Authentication setup warning:', error);
  }
}

export default globalSetup; 