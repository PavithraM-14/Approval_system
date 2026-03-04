/**
 * OrangeHRM Integration Service
 * Handles employee management and document linking
 */

interface OrangeHRMConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
}

interface Employee {
  empNumber: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  employeeId: string;
  email?: string;
  [key: string]: any;
}

export class OrangeHRMClient {
  private config: OrangeHRMConfig;
  private accessToken: string | null = null;

  constructor(config: OrangeHRMConfig) {
    this.config = config;
  }

  /**
   * Authenticate with OrangeHRM
   */
  async authenticate(): Promise<void> {
    const response = await fetch(`${this.config.url}/oauth/issueToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        username: this.config.username || '',
        password: this.config.password || '',
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OrangeHRM authentication failed: ${data.error_description}`);
    }

    if (!data.access_token) {
      throw new Error('OrangeHRM authentication failed: No access token returned');
    }

    this.accessToken = data.access_token;
  }

  /**
   * Make API request
   */
  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Authentication failed: No access token available');
    }

    const response = await fetch(`${this.config.url}/api/v2${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`OrangeHRM API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get employees
   */
  async getEmployees(filters?: {
    name?: string;
    employeeId?: string;
    limit?: number;
  }): Promise<Employee[]> {
    let endpoint = '/pim/employees';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(endpoint);
    return response.data || [];
  }

  /**
   * Get employee by ID
   */
  async getEmployee(empNumber: number): Promise<Employee> {
    const response = await this.request(`/pim/employees/${empNumber}`);
    return response.data;
  }

  /**
   * Create employee
   */
  async createEmployee(data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    employeeId: string;
  }): Promise<number> {
    const response = await this.request('/pim/employees', 'POST', data);
    return response.data.empNumber;
  }

  /**
   * Update employee
   */
  async updateEmployee(empNumber: number, data: Partial<Employee>): Promise<boolean> {
    await this.request(`/pim/employees/${empNumber}`, 'PUT', data);
    return true;
  }

  /**
   * Get employee documents
   */
  async getEmployeeDocuments(empNumber: number): Promise<any[]> {
    const response = await this.request(`/pim/employees/${empNumber}/documents`);
    return response.data || [];
  }

  /**
   * Upload employee document
   */
  async uploadDocument(
    empNumber: number,
    document: {
      type: string;
      filename: string;
      content: Buffer;
      description?: string;
    }
  ): Promise<string> {
    const base64Content = document.content.toString('base64');

    const response = await this.request(
      `/pim/employees/${empNumber}/documents`,
      'POST',
      {
        type: document.type,
        filename: document.filename,
        description: document.description,
        attachment: base64Content,
      }
    );

    return response.data.id;
  }

  /**
   * Get leave requests
   */
  async getLeaveRequests(filters?: {
    empNumber?: number;
    status?: string;
  }): Promise<any[]> {
    let endpoint = '/leave/leave-requests';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.empNumber) params.append('empNumber', filters.empNumber.toString());
      if (filters.status) params.append('status', filters.status);
      
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(endpoint);
    return response.data || [];
  }

  /**
   * Get employee performance reviews
   */
  async getPerformanceReviews(empNumber: number): Promise<any[]> {
    const response = await this.request(
      `/performance/employees/${empNumber}/reviews`
    );

    return response.data || [];
  }

  /**
   * Link S.E.A.D. document to employee
   */
  async linkSeadDocument(
    empNumber: number,
    documentId: string,
    documentUrl: string,
    documentName: string,
    documentType: string = 'other'
  ): Promise<string> {
    // Create a document reference
    const response = await this.request(
      `/pim/employees/${empNumber}/documents`,
      'POST',
      {
        type: documentType,
        filename: documentName,
        description: `S.E.A.D. Document ID: ${documentId}\nURL: ${documentUrl}`,
        attachment: '', // Empty attachment, just a reference
      }
    );

    return response.data.id;
  }

  /**
   * Get employee by email
   */
  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    const employees = await this.getEmployees();
    
    for (const emp of employees) {
      const details = await this.getEmployee(emp.empNumber);
      if (details.email === email) {
        return details;
      }
    }

    return null;
  }

  /**
   * Get job titles
   */
  async getJobTitles(): Promise<any[]> {
    const response = await this.request('/admin/job-titles');
    return response.data || [];
  }

  /**
   * Get departments
   */
  async getDepartments(): Promise<any[]> {
    const response = await this.request('/pim/departments');
    return response.data || [];
  }
}

/**
 * Get OrangeHRM client instance
 */
export function getOrangeHRMClient(): OrangeHRMClient {
  const config: OrangeHRMConfig = {
    url: process.env.ORANGEHRM_URL || 'http://localhost:8081',
    clientId: process.env.ORANGEHRM_CLIENT_ID || '',
    clientSecret: process.env.ORANGEHRM_CLIENT_SECRET || '',
    username: process.env.ORANGEHRM_USERNAME,
    password: process.env.ORANGEHRM_PASSWORD,
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error('OrangeHRM credentials not configured');
  }

  return new OrangeHRMClient(config);
}
