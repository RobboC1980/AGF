#!/usr/bin/env node

// Using built-in fetch (Node.js 18+)
const API_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:3000';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error };
  }
}

// Test suite
async function runTests() {
  console.log('🧪 AgileForge Comprehensive Test Suite\n');
  console.log('=====================================\n');

  // 1. Backend Health Check
  console.log('1️⃣  Backend Health Checks\n');
  
  const { response: healthResponse, data: healthData, error: healthError } = await apiRequest('/health');
  logTest('Backend health endpoint', !healthError && healthResponse?.ok, 
    healthError ? `Error: ${healthError.message}` : `Status: ${healthData?.status}`);

  const { response: statusResponse, data: statusData, error: statusError } = await apiRequest('/api/status');
  logTest('Backend status endpoint', !statusError && statusResponse?.ok,
    statusError ? `Error: ${statusError.message}` : `Entities: ${JSON.stringify(statusData?.entities || {})}`);

  // 2. Authentication Tests
  console.log('\n2️⃣  User Management Tests\n');
  
  // Get all users
  const { response: usersResponse, data: usersData, error: usersError } = await apiRequest('/api/users');
  logTest('Get all users', !usersError && usersResponse?.ok,
    usersError ? `Error: ${usersError.message}` : `Users count: ${usersData?.length || 0}`);

  // Create new user
  const testUser = {
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    password: 'TestPassword123!'
  };
  
  const { response: createUserResponse, data: createUserData, error: createUserError } = await apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });
  
  logTest('Create user', !createUserError && createUserResponse?.ok,
    createUserError ? `Error: ${createUserError.message}` : `User ID: ${createUserData?.id}`);

  // 3. CRUD Operations Tests
  console.log('\n3️⃣  CRUD Operations Tests\n');

  // Projects
  const { response: projectsResponse, data: projectsData, error: projectsError } = await apiRequest('/api/projects');
  
  logTest('Get all projects', !projectsError && projectsResponse?.ok,
    projectsError ? `Error: ${projectsError.message}` : `Projects count: ${projectsData?.length || 0}`);

  // Create project
  const newProject = {
    name: 'Test Project',
    key: 'TEST',
    description: 'Test project description',
    priority: 'high'
  };
  
  const { response: createProjectResponse, data: createProjectData, error: createProjectError } = 
    await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify(newProject)
    });
  
  logTest('Create project', !createProjectError && createProjectResponse?.ok,
    createProjectError ? `Error: ${createProjectError.message}` : `Project ID: ${createProjectData?.id}`);

  // Epics
  const { response: epicsResponse, data: epicsData, error: epicsError } = await apiRequest('/api/epics');
  
  logTest('Get all epics', !epicsError && epicsResponse?.ok,
    epicsError ? `Error: ${epicsError.message}` : `Epics count: ${epicsData?.length || 0}`);

  // Stories
  const { response: storiesResponse, data: storiesData, error: storiesError } = await apiRequest('/api/stories');
  
  logTest('Get all stories', !storiesError && storiesResponse?.ok,
    storiesError ? `Error: ${storiesError.message}` : `Stories count: ${storiesData?.length || 0}`);

  // Create story
  const newStory = {
    epic_id: epicsData?.[0]?.id || '1',
    title: 'Test Story',
    description: 'Test story description',
    acceptance_criteria: 'Given a user, when they perform an action, then they should see a result',
    priority: 'medium',
    story_points: 5
  };
  
  const { response: createStoryResponse, data: createStoryData, error: createStoryError } = 
    await apiRequest('/api/stories', {
      method: 'POST',
      body: JSON.stringify(newStory)
    });
  
  logTest('Create story', !createStoryError && createStoryResponse?.ok,
    createStoryError ? `Error: ${createStoryError.message}` : `Story ID: ${createStoryData?.id}`);

  // Tasks
  const { response: tasksResponse, data: tasksData, error: tasksError } = await apiRequest('/api/tasks');
  
  logTest('Get all tasks', !tasksError && tasksResponse?.ok,
    tasksError ? `Error: ${tasksError.message}` : `Tasks count: ${tasksData?.length || 0}`);

  // 4. AI Features Tests
  console.log('\n4️⃣  AI Features Tests\n');

  const aiStoryRequest = {
    description: 'User authentication system',
    priority: 'high',
    includeAcceptanceCriteria: true,
    includeTags: true
  };
  
  const { response: aiResponse, data: aiData, error: aiError } = await apiRequest('/api/stories/generate', {
    method: 'POST',
    body: JSON.stringify(aiStoryRequest)
  });
  
  logTest('AI story generation', !aiError && aiResponse?.ok,
    aiError ? `Error: ${aiError.message}` : `Generated: ${aiData?.story?.title || 'No story'}`);

  // 5. Search Tests
  console.log('\n5️⃣  Search Tests\n');

  const { response: searchResponse, data: searchData, error: searchError } = 
    await apiRequest('/api/search?q=test');
  
  logTest('Search functionality', !searchError && searchResponse?.ok,
    searchError ? `Error: ${searchError.message}` : `Results: ${searchData?.results?.length || 0}`);

  // 6. Analytics Tests
  console.log('\n6️⃣  Analytics Tests\n');

  const { response: analyticsResponse, data: analyticsData, error: analyticsError } = 
    await apiRequest('/api/analytics/overview');
  
  logTest('Analytics overview', !analyticsError && analyticsResponse?.ok,
    analyticsError ? `Error: ${analyticsError.message}` : `Total stories: ${analyticsData?.total_stories || 0}`);

  // 7. Frontend Tests
  console.log('\n7️⃣  Frontend Tests\n');

  try {
    const frontendResponse = await fetch(FRONTEND_URL);
    logTest('Frontend is accessible', frontendResponse.ok,
      `Status: ${frontendResponse.status}`);
  } catch (error) {
    logTest('Frontend is accessible', false, `Error: ${error.message}`);
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Test Summary\n');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
}); 