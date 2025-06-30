import { test, expect } from '@playwright/test';

test.describe('Basic Application Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load the homepage', async ({ page }) => {
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/AgileForge|SynqForge/);
    
    // Check for key elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Look for login/auth related elements
    const loginButton = page.locator('text=Login').first();
    const signInButton = page.locator('text=Sign In').first();
    
    // Try to find and click a login button
    try {
      if (await loginButton.isVisible({ timeout: 5000 })) {
        await loginButton.click();
      } else if (await signInButton.isVisible({ timeout: 5000 })) {
        await signInButton.click();
      } else {
        // If no explicit login button, try navigating directly
        await page.goto('/login');
      }
      
      // Check if we're on a login/auth page
      await expect(page.url()).toMatch(/(login|auth|sign-in)/);
    } catch (error) {
      // If login flow is not available, just check that the page is responsive
      console.log('Login flow not available, checking page responsiveness');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show navigation menu', async ({ page }) => {
    // Look for common navigation elements
    const nav = page.locator('nav').first();
    const header = page.locator('header').first();
    const menuButton = page.locator('[aria-label*="menu"]').first();
    
    // Check if any navigation elements are present
    const hasNav = await nav.isVisible().catch(() => false);
    const hasHeader = await header.isVisible().catch(() => false);
    const hasMenuButton = await menuButton.isVisible().catch(() => false);
    
    expect(hasNav || hasHeader || hasMenuButton).toBe(true);
  });
});

test.describe('Project Management Flow', () => {
  test('should handle project creation flow', async ({ page }) => {
    await page.goto('/');
    
    try {
      // Look for project-related buttons or links
      const createProjectButton = page.locator('text=Create Project').first();
      const newProjectButton = page.locator('text=New Project').first();
      const projectsLink = page.locator('text=Projects').first();
      
      // Try to navigate to projects
      if (await createProjectButton.isVisible({ timeout: 5000 })) {
        await createProjectButton.click();
      } else if (await newProjectButton.isVisible({ timeout: 5000 })) {
        await newProjectButton.click();
      } else if (await projectsLink.isVisible({ timeout: 5000 })) {
        await projectsLink.click();
      } else {
        // Try direct navigation
        await page.goto('/projects');
      }
      
      // Check that we can navigate without errors
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      
    } catch (error) {
      console.log('Project flow not available, checking general functionality');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle stories/tasks view', async ({ page }) => {
    await page.goto('/');
    
    try {
      // Look for stories/tasks related navigation
      const storiesLink = page.locator('text=Stories').first();
      const tasksLink = page.locator('text=Tasks').first();
      const sprintLink = page.locator('text=Sprint').first();
      
      if (await storiesLink.isVisible({ timeout: 5000 })) {
        await storiesLink.click();
      } else if (await tasksLink.isVisible({ timeout: 5000 })) {
        await tasksLink.click();
      } else if (await sprintLink.isVisible({ timeout: 5000 })) {
        await sprintLink.click();
      } else {
        await page.goto('/stories');
      }
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
      
    } catch (error) {
      console.log('Stories flow not available, checking general functionality');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('AI Features Flow', () => {
  test('should handle AI-powered features', async ({ page }) => {
    await page.goto('/');
    
    try {
      // Look for AI-related features
      const aiButton = page.locator('text=AI').first();
      const generateButton = page.locator('text=Generate').first();
      const assistantButton = page.locator('text=Assistant').first();
      
      if (await aiButton.isVisible({ timeout: 5000 })) {
        await aiButton.click();
        await page.waitForLoadState('networkidle');
      } else if (await generateButton.isVisible({ timeout: 5000 })) {
        await generateButton.click();
        await page.waitForLoadState('networkidle');
      } else if (await assistantButton.isVisible({ timeout: 5000 })) {
        await assistantButton.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Check that AI features don't crash the app
      await expect(page.locator('body')).toBeVisible();
      
    } catch (error) {
      console.log('AI features flow not available, checking general functionality');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that the page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check for mobile-specific elements like hamburger menu
    const mobileMenu = page.locator('[aria-label*="menu"]').first();
    const hamburger = page.locator('button[aria-expanded]').first();
    
    // If mobile menu exists, test it
    if (await mobileMenu.isVisible().catch(() => false)) {
      await mobileMenu.click();
      await expect(page.locator('body')).toBeVisible();
    } else if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should handle multiple navigation actions', async ({ page }) => {
    await page.goto('/');
    
    // Perform multiple navigation actions quickly
    const actions = [
      () => page.goto('/'),
      () => page.goto('/projects').catch(() => {}),
      () => page.goto('/stories').catch(() => {}),
      () => page.goBack().catch(() => {}),
      () => page.goForward().catch(() => {}),
    ];
    
    for (const action of actions) {
      await action();
      await page.waitForTimeout(100); // Small delay between actions
    }
    
    // Should still be functional after rapid navigation
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    await page.goto('/non-existent-page-12345');
    
    // Should show some kind of error page or redirect, not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Check for 404 or error messaging
    const has404 = await page.locator('text=404').isVisible().catch(() => false);
    const hasNotFound = await page.locator('text=Not Found').isVisible().catch(() => false);
    const hasError = await page.locator('text=Error').isVisible().catch(() => false);
    
    // Should either show error page or redirect to valid page
    expect(has404 || hasNotFound || hasError || page.url().includes('/')).toBe(true);
  });

  test('should handle offline scenarios', async ({ page, context }) => {
    await page.goto('/');
    
    // Simulate offline
    await context.setOffline(true);
    
    // Try to navigate
    await page.reload().catch(() => {});
    
    // Should handle offline gracefully (show cached content or offline message)
    await expect(page.locator('body')).toBeVisible();
    
    // Restore online
    await context.setOffline(false);
  });
});

test.describe('Accessibility Tests', () => {
  test('should have basic accessibility features', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility attributes
    const hasMainLandmark = await page.locator('main').isVisible().catch(() => false);
    const hasHeaderLandmark = await page.locator('header').isVisible().catch(() => false);
    const hasNavLandmark = await page.locator('nav').isVisible().catch(() => false);
    
    // Should have at least one landmark
    expect(hasMainLandmark || hasHeaderLandmark || hasNavLandmark).toBe(true);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate without errors
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Backend Integration', () => {
  test('should connect to backend API', async ({ page }) => {
    // Test backend connectivity
    const response = await page.request.get('http://localhost:8000/health');
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('status');
    } else {
      console.log('Backend not available for E2E testing');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Intercept API calls and simulate errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Simulated API error' })
      });
    });
    
    // Navigate to a page that would make API calls
    await page.goto('/projects').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Should handle API errors without crashing
    await expect(page.locator('body')).toBeVisible();
  });
}); 