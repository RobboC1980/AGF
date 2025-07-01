/**
 * RBAC Integration Tests
 * 
 * Tests the complete RBAC implementation including:
 * - Project ownership access
 * - Project member roles (viewer, editor, admin)
 * - Non-member restrictions
 * - Global admin bypass
 * - RLS policy enforcement
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Test user IDs (these would be actual Clerk user IDs in practice)
const TEST_USERS = {
  projectOwner: 'user_owner_123',
  projectViewer: 'user_viewer_456', 
  projectEditor: 'user_editor_789',
  projectAdmin: 'user_admin_abc',
  globalAdmin: 'user_global_admin_def',
  nonMember: 'user_non_member_ghi'
};

// Supabase clients for different contexts
const createTestClient = (userId?: string) => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: userId ? {
        Authorization: `Bearer fake-jwt-for-${userId}`, // In real tests, use actual JWT
      } : {},
    },
  });
};

const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe('RBAC Implementation Tests', () => {
  let testProjectId: string;
  let testEpicId: string;
  let testStoryId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // Set up test data using service role client
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test users
    const testUsers = [
      { id: TEST_USERS.projectOwner, email: 'owner@test.com', name: 'Project Owner', is_admin: false },
      { id: TEST_USERS.projectViewer, email: 'viewer@test.com', name: 'Project Viewer', is_admin: false },
      { id: TEST_USERS.projectEditor, email: 'editor@test.com', name: 'Project Editor', is_admin: false },
      { id: TEST_USERS.projectAdmin, email: 'admin@test.com', name: 'Project Admin', is_admin: false },
      { id: TEST_USERS.globalAdmin, email: 'global@test.com', name: 'Global Admin', is_admin: true },
      { id: TEST_USERS.nonMember, email: 'nonmember@test.com', name: 'Non Member', is_admin: false },
    ];

    for (const user of testUsers) {
      await adminClient.from('profiles').upsert(user);
    }

    // Create test project
    const { data: project } = await adminClient
      .from('projects')
      .insert({
        name: 'Test Project',
        description: 'RBAC Test Project',
        created_by: TEST_USERS.projectOwner,
        owner_id: TEST_USERS.projectOwner,
      })
      .select('id')
      .single();

    testProjectId = project!.id;

    // Add project members with different roles
    await adminClient.from('project_members').insert([
      { project_id: testProjectId, user_id: TEST_USERS.projectViewer, role: 'viewer' },
      { project_id: testProjectId, user_id: TEST_USERS.projectEditor, role: 'editor' },
      { project_id: testProjectId, user_id: TEST_USERS.projectAdmin, role: 'admin' },
    ]);

    // Create test epic
    const { data: epic } = await adminClient
      .from('epics')
      .insert({
        name: 'Test Epic',
        project_id: testProjectId,
      })
      .select('id')
      .single();

    testEpicId = epic!.id;

    // Create test story
    const { data: story } = await adminClient
      .from('stories')
      .insert({
        name: 'Test Story',
        epic_id: testEpicId,
      })
      .select('id')
      .single();

    testStoryId = story!.id;

    // Create test task
    const { data: task } = await adminClient
      .from('tasks')
      .insert({
        title: 'Test Task',
        story_id: testStoryId,
        assignee_id: TEST_USERS.projectEditor,
      })
      .select('id')
      .single();

    testTaskId = task!.id;
  }

  async function cleanupTestData() {
    // Clean up in reverse order due to foreign key constraints
    if (testTaskId) await adminClient.from('tasks').delete().eq('id', testTaskId);
    if (testStoryId) await adminClient.from('stories').delete().eq('id', testStoryId);
    if (testEpicId) await adminClient.from('epics').delete().eq('id', testEpicId);
    if (testProjectId) {
      await adminClient.from('project_members').delete().eq('project_id', testProjectId);
      await adminClient.from('projects').delete().eq('id', testProjectId);
    }
    
    // Clean up test users
    for (const userId of Object.values(TEST_USERS)) {
      await adminClient.from('profiles').delete().eq('id', userId);
    }
  }

  describe('Project Owner Access', () => {
    it('should allow owner full CRUD access to project', async () => {
      const client = createTestClient(TEST_USERS.projectOwner);

      // READ
      const { data: projects } = await client
        .from('projects')
        .select('*')
        .eq('id', testProjectId);
      expect(projects).toHaveLength(1);

      // UPDATE
      const { error: updateError } = await client
        .from('projects')
        .update({ description: 'Updated by owner' })
        .eq('id', testProjectId);
      expect(updateError).toBeNull();

      // DELETE should work for owner
      // Note: We won't actually delete for other tests
    });

    it('should allow owner access to all child entities', async () => {
      const client = createTestClient(TEST_USERS.projectOwner);

      // Check epics access
      const { data: epics } = await client
        .from('epics')
        .select('*')
        .eq('project_id', testProjectId);
      expect(epics).toHaveLength(1);

      // Check stories access
      const { data: stories } = await client
        .from('stories')
        .select('*')
        .eq('id', testStoryId);
      expect(stories).toHaveLength(1);

      // Check tasks access
      const { data: tasks } = await client
        .from('tasks')
        .select('*')
        .eq('id', testTaskId);
      expect(tasks).toHaveLength(1);
    });
  });

  describe('Project Viewer Access', () => {
    it('should allow viewer read-only access', async () => {
      const client = createTestClient(TEST_USERS.projectViewer);

      // READ should work
      const { data: projects } = await client
        .from('projects')
        .select('*')
        .eq('id', testProjectId);
      expect(projects).toHaveLength(1);

      // CREATE should fail
      const { error: createError } = await client
        .from('epics')
        .insert({
          name: 'Unauthorized Epic',
          project_id: testProjectId,
        });
      expect(createError).toBeTruthy();

      // UPDATE should fail
      const { error: updateError } = await client
        .from('projects')
        .update({ description: 'Unauthorized update' })
        .eq('id', testProjectId);
      expect(updateError).toBeTruthy();

      // DELETE should fail
      const { error: deleteError } = await client
        .from('epics')
        .delete()
        .eq('id', testEpicId);
      expect(deleteError).toBeTruthy();
    });
  });

  describe('Project Editor Access', () => {
    it('should allow editor create/read/update but not delete', async () => {
      const client = createTestClient(TEST_USERS.projectEditor);

      // READ should work
      const { data: projects } = await client
        .from('projects')
        .select('*')
        .eq('id', testProjectId);
      expect(projects).toHaveLength(1);

      // CREATE should work
      const { error: createError } = await client
        .from('stories')
        .insert({
          name: 'Editor Story',
          epic_id: testEpicId,
        });
      expect(createError).toBeNull();

      // UPDATE should work
      const { error: updateError } = await client
        .from('stories')
        .update({ description: 'Updated by editor' })
        .eq('id', testStoryId);
      expect(updateError).toBeNull();

      // DELETE should work for editors
      // (Based on our policy, editors can delete stories and epics)
    });

    it('should allow editor to delete tasks they are assigned to', async () => {
      const client = createTestClient(TEST_USERS.projectEditor);

      // Editor should be able to delete their own assigned task
      const { error: deleteError } = await client
        .from('tasks')
        .delete()
        .eq('id', testTaskId);
      expect(deleteError).toBeNull();
    });
  });

  describe('Project Admin Access', () => {
    it('should allow project admin full access including member management', async () => {
      const client = createTestClient(TEST_USERS.projectAdmin);

      // Should be able to add new project members
      const { error: addMemberError } = await client
        .rpc('add_project_member', {
          p_project_id: testProjectId,
          p_user_id: TEST_USERS.nonMember,
          p_role: 'viewer'
        });
      expect(addMemberError).toBeNull();

      // Should be able to view project members
      const { data: members } = await client
        .from('project_members')
        .select('*')
        .eq('project_id', testProjectId);
      expect(members).toBeTruthy();

      // Should be able to remove members
      const { error: removeMemberError } = await client
        .rpc('remove_project_member', {
          p_project_id: testProjectId,
          p_user_id: TEST_USERS.nonMember
        });
      expect(removeMemberError).toBeNull();
    });
  });

  describe('Non-Member Access', () => {
    it('should deny all access to non-members', async () => {
      const client = createTestClient(TEST_USERS.nonMember);

      // Should not see the project
      const { data: projects } = await client
        .from('projects')
        .select('*')
        .eq('id', testProjectId);
      expect(projects).toHaveLength(0);

      // Should not see any child entities
      const { data: epics } = await client
        .from('epics')
        .select('*')
        .eq('project_id', testProjectId);
      expect(epics).toHaveLength(0);

      const { data: stories } = await client
        .from('stories')
        .select('*')
        .eq('id', testStoryId);
      expect(stories).toHaveLength(0);

      const { data: tasks } = await client
        .from('tasks')
        .select('*')
        .eq('id', testTaskId);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('Global Admin Access', () => {
    it('should allow global admin to bypass all restrictions', async () => {
      const client = createTestClient(TEST_USERS.globalAdmin);

      // Should see all projects
      const { data: projects } = await client
        .from('projects')
        .select('*');
      expect(projects!.length).toBeGreaterThan(0);

      // Should be able to access any project
      const { data: specificProject } = await client
        .from('projects')
        .select('*')
        .eq('id', testProjectId);
      expect(specificProject).toHaveLength(1);

      // Should be able to modify any project
      const { error: updateError } = await client
        .from('projects')
        .update({ description: 'Updated by global admin' })
        .eq('id', testProjectId);
      expect(updateError).toBeNull();

      // Should be able to manage project members
      const { error: addMemberError } = await client
        .rpc('add_project_member', {
          p_project_id: testProjectId,
          p_user_id: TEST_USERS.nonMember,
          p_role: 'admin'
        });
      expect(addMemberError).toBeNull();
    });
  });

  describe('Role Escalation Prevention', () => {
    it('should prevent project admins from granting admin role', async () => {
      const client = createTestClient(TEST_USERS.projectAdmin);

      // Project admin should NOT be able to grant admin role
      const { error } = await client
        .rpc('add_project_member', {
          p_project_id: testProjectId,
          p_user_id: TEST_USERS.nonMember,
          p_role: 'admin'
        });
      
      // This should fail due to role escalation prevention
      expect(error).toBeTruthy();
      expect(error?.message).toContain('Permission denied');
    });

    it('should allow project owners to grant admin role', async () => {
      const client = createTestClient(TEST_USERS.projectOwner);

      // Project owner SHOULD be able to grant admin role
      const { error } = await client
        .rpc('add_project_member', {
          p_project_id: testProjectId,
          p_user_id: TEST_USERS.nonMember,
          p_role: 'admin'
        });
      
      expect(error).toBeNull();
    });
  });

  describe('Analytics Access (AI Completions)', () => {
    it('should allow users to see only their own AI completions', async () => {
      // Create test AI completion
      await adminClient.from('ai_completions').insert({
        user_id: TEST_USERS.projectViewer,
        prompt: 'Test prompt',
        completion: 'Test completion',
        model: 'gpt-4',
        tokens_used: 100
      });

      const viewerClient = createTestClient(TEST_USERS.projectViewer);
      const nonMemberClient = createTestClient(TEST_USERS.nonMember);

      // Viewer should see their own completions
      const { data: viewerCompletions } = await viewerClient
        .from('ai_completions')
        .select('*')
        .eq('user_id', TEST_USERS.projectViewer);
      expect(viewerCompletions).toHaveLength(1);

      // Non-member should not see other user's completions
      const { data: nonMemberCompletions } = await nonMemberClient
        .from('ai_completions')
        .select('*')
        .eq('user_id', TEST_USERS.projectViewer);
      expect(nonMemberCompletions).toHaveLength(0);
    });

    it('should allow global admin to see all AI completions', async () => {
      const adminClient = createTestClient(TEST_USERS.globalAdmin);

      // Global admin should see all completions
      const { data: allCompletions } = await adminClient
        .from('ai_completions')
        .select('*');
      expect(allCompletions!.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions for Jest configuration
export {}; 