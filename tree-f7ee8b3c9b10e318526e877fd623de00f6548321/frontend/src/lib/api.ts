class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
    // Don't initialize token from localStorage here as it may not be available yet
    this.token = null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(method: string, url: string, data?: any) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${url}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    return {};
  }

  async get(url: string) {
    return { data: await this.request('GET', url) };
  }

  async post(url: string, data?: any) {
    return { data: await this.request('POST', url, data) };
  }

  async put(url: string, data?: any) {
    return { data: await this.request('PUT', url, data) };
  }

  async patch(url: string, data?: any) {
    return { data: await this.request('PATCH', url, data) };
  }

  async delete(url: string) {
    return { data: await this.request('DELETE', url) };
  }
}

export const api = new ApiClient();
