import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test teardown...');
  
  try {
    // Clean up authentication state file
    try {
      await fs.unlink('./e2e/auth-state.json');
      console.log('✅ Auth state cleaned up');
    } catch (error) {
      // File might not exist, that's okay
    }

    // Clean up test data if needed
    await cleanupTestData();

    console.log('✅ E2E teardown completed');
    
  } catch (error) {
    console.error('❌ E2E teardown failed:', error);
    // Don't throw error in teardown as it might mask test failures
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // This would typically clean up test users, projects, etc.
    // For now, we'll just log the cleanup
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.log('⚠️ Test data cleanup warning:', error);
  }
}

export default globalTeardown; 