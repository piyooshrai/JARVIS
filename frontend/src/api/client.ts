const API_BASE = '/api';

export interface Domain {
  id: string;
  name: string;
  is_verified: boolean;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  domain: string;
  last_sign_in: string | null;
  account_enabled: boolean;
  license_type: string | null;
  department: string | null;
  manager: string | null;
}

export interface UserListResponse {
  users: User[];
  total: number;
  monthly_cost: number;
}

export interface CreateUserRequest {
  full_name: string;
  username: string;
  domain: string;
  department?: string;
  manager_email?: string;
  license_type: string;
}

export interface AIAnalysisResponse {
  response: string;
  recommendations?: string[];
}

class APIClient {
  async getDomains(): Promise<Domain[]> {
    const response = await fetch(`${API_BASE}/domains`);
    if (!response.ok) throw new Error('Failed to fetch domains');
    return response.json();
  }

  async getUsers(domain?: string): Promise<UserListResponse> {
    const url = domain ? `${API_BASE}/users?domain=${domain}` : `${API_BASE}/users`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create user');
    }
    return response.json();
  }

  async disableUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/users/${userId}/disable`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to disable user');
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
  }

  async analyzeUsers(): Promise<AIAnalysisResponse> {
    const response = await fetch(`${API_BASE}/analyze-users`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to analyze users');
    return response.json();
  }

  async askJarvis(question: string, context?: any): Promise<{ response: string }> {
    const response = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, context }),
    });
    if (!response.ok) throw new Error('Failed to get response from JARVIS');
    return response.json();
  }
}

export const apiClient = new APIClient();
