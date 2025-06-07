// Real API client for AgileForge backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Dashboard
  async getDashboard() {
    return this.request<{ stats: any; message: string }>('/dashboard');
  }

  // Projects
  async getProjects() {
    return this.request<{ projects: any[] }>('/projects');
  }

  async getProject(id: string) {
    return this.request<{ project: any }>(`/projects/${id}`);
  }

  async createProject(project: any) {
    return this.request<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: any) {
    return this.request<{ project: any }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Epics
  async getEpics(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.request<{ epics: any[] }>(`/epics${query}`);
  }

  async getEpic(id: string) {
    return this.request<{ epic: any }>(`/epics/${id}`);
  }

  async createEpic(epic: any) {
    return this.request<{ epic: any }>('/epics', {
      method: 'POST',
      body: JSON.stringify(epic),
    });
  }

  async updateEpic(id: string, epic: any) {
    return this.request<{ epic: any }>(`/epics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(epic),
    });
  }

  async deleteEpic(id: string) {
    return this.request(`/epics/${id}`, {
      method: 'DELETE',
    });
  }

  // Stories
  async getStories(epicId?: string) {
    const query = epicId ? `?epicId=${epicId}` : '';
    return this.request<{ stories: any[] }>(`/stories${query}`);
  }

  async getStory(id: string) {
    return this.request<{ story: any }>(`/stories/${id}`);
  }

  async createStory(story: any) {
    return this.request<{ story: any }>('/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    });
  }

  async updateStory(id: string, story: any) {
    return this.request<{ story: any }>(`/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(story),
    });
  }

  async deleteStory(id: string) {
    return this.request(`/stories/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(filters?: { storyId?: string; sprintId?: string; status?: string; assignedTo?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ tasks: any[] }>(`/tasks${query}`);
  }

  async getTask(id: string) {
    return this.request<{ task: any }>(`/tasks/${id}`);
  }

  async createTask(task: any) {
    return this.request<{ task: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, task: any) {
    return this.request<{ task: any }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  async updateTaskStatus(id: string, status: string) {
    return this.request<{ task: any }>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Sprints
  async getSprints(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.request<{ sprints: any[] }>(`/sprints${query}`);
  }

  async getSprint(id: string) {
    return this.request<{ sprint: any }>(`/sprints/${id}`);
  }

  async createSprint(sprint: any) {
    return this.request<{ sprint: any }>('/sprints', {
      method: 'POST',
      body: JSON.stringify(sprint),
    });
  }

  async updateSprint(id: string, sprint: any) {
    return this.request<{ sprint: any }>(`/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sprint),
    });
  }

  async deleteSprint(id: string) {
    return this.request(`/sprints/${id}`, {
      method: 'DELETE',
    });
  }

  // AI Services (if available)
  async generateStory(epicName: string, projectName: string) {
    return this.request<{ story: any }>('/ai/generate-story', {
      method: 'POST',
      body: JSON.stringify({ epicName, projectName }),
    });
  }

  // Analytics (when real implementation is available)
  async getAnalytics(projectId?: string, timeRange?: string) {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (timeRange) params.append('timeRange', timeRange);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/analytics/dashboard${query}`);
  }

  async getVelocityData(projectId?: string, sprints?: number) {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (sprints) params.append('sprints', sprints.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any>(`/analytics/velocity${query}`);
  }

  async getBurndownData(sprintId: string) {
    return this.request<any>(`/analytics/burndown/${sprintId}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient; 