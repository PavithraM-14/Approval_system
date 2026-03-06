/**
 * SuiteCRM Integration Service
 * Handles customer management and document linking
 */

interface SuiteCRMConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
}

interface CRMContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  account_name?: string;
  [key: string]: any;
}

export class SuiteCRMClient {
  private config: SuiteCRMConfig;
  private accessToken: string | null = null;

  constructor(config: SuiteCRMConfig) {
    this.config = config;
  }

  /**
   * Authenticate with SuiteCRM
   */
  async authenticate(): Promise<void> {
    const response = await fetch(`${this.config.url}/Api/access_token`, {
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
      throw new Error(`SuiteCRM authentication failed: ${data.error_description}`);
    }

    if (!data.access_token) {
      throw new Error('SuiteCRM authentication failed: No access token returned');
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

    const response = await fetch(`${this.config.url}/Api/V8${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`SuiteCRM API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get contacts
   */
  async getContacts(filters?: {
    account_name?: string;
    email?: string;
    limit?: number;
  }): Promise<CRMContact[]> {
    let endpoint = '/module/Contacts';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.account_name) params.append('filter[account_name]', filters.account_name);
      if (filters.email) params.append('filter[email]', filters.email);
      if (filters.limit) params.append('page[size]', filters.limit.toString());
      
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(endpoint);
    return response.data || [];
  }

  /**
   * Get contact by ID
   */
  async getContact(id: string): Promise<CRMContact> {
    const response = await this.request(`/module/Contacts/${id}`);
    return response.data;
  }

  /**
   * Create contact
   */
  async createContact(data: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    account_id?: string;
  }): Promise<string> {
    const response = await this.request('/module/Contacts', 'POST', {
      data: {
        type: 'Contacts',
        attributes: data,
      },
    });

    return response.data.id;
  }

  /**
   * Update contact
   */
  async updateContact(id: string, data: Partial<CRMContact>): Promise<boolean> {
    await this.request(`/module/Contacts/${id}`, 'PATCH', {
      data: {
        type: 'Contacts',
        id,
        attributes: data,
      },
    });

    return true;
  }

  /**
   * Get accounts (companies)
   */
  async getAccounts(search?: string): Promise<any[]> {
    let endpoint = '/module/Accounts';
    
    if (search) {
      endpoint += `?filter[name]=${encodeURIComponent(search)}`;
    }

    const response = await this.request(endpoint);
    return response.data || [];
  }

  /**
   * Get opportunities (deals)
   */
  async getOpportunities(filters?: {
    account_id?: string;
    sales_stage?: string;
  }): Promise<any[]> {
    let endpoint = '/module/Opportunities';
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.account_id) params.append('filter[account_id]', filters.account_id);
      if (filters.sales_stage) params.append('filter[sales_stage]', filters.sales_stage);
      
      endpoint += `?${params.toString()}`;
    }

    const response = await this.request(endpoint);
    return response.data || [];
  }

  /**
   * Attach document to contact
   */
  async attachDocument(
    contactId: string,
    document: {
      filename: string;
      content: Buffer;
      mimeType: string;
    }
  ): Promise<string> {
    const base64Content = document.content.toString('base64');

    const response = await this.request('/module/Documents', 'POST', {
      data: {
        type: 'Documents',
        attributes: {
          document_name: document.filename,
          filename: document.filename,
          file: base64Content,
        },
        relationships: {
          contacts: {
            data: [{ type: 'Contacts', id: contactId }],
          },
        },
      },
    });

    return response.data.id;
  }

  /**
   * Get documents for contact
   */
  async getContactDocuments(contactId: string): Promise<any[]> {
    const response = await this.request(
      `/module/Contacts/${contactId}/relationships/documents`
    );

    return response.data || [];
  }

  /**
   * Link S.E.A.D. document to CRM contact
   */
  async linkSeadDocument(
    contactId: string,
    documentId: string,
    documentUrl: string,
    documentName: string
  ): Promise<string> {
    // Create a note with document link
    const response = await this.request('/module/Notes', 'POST', {
      data: {
        type: 'Notes',
        attributes: {
          name: `S.E.A.D. Document: ${documentName}`,
          description: `Document ID: ${documentId}\nURL: ${documentUrl}`,
        },
        relationships: {
          contacts: {
            data: [{ type: 'Contacts', id: contactId }],
          },
        },
      },
    });

    return response.data.id;
  }
}

/**
 * Get SuiteCRM client instance
 */
export function getSuiteCRMClient(): SuiteCRMClient {
  const config: SuiteCRMConfig = {
    url: process.env.SUITECRM_URL || 'http://localhost:8080',
    clientId: process.env.SUITECRM_CLIENT_ID || '',
    clientSecret: process.env.SUITECRM_CLIENT_SECRET || '',
    username: process.env.SUITECRM_USERNAME,
    password: process.env.SUITECRM_PASSWORD,
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error('SuiteCRM credentials not configured');
  }

  return new SuiteCRMClient(config);
}
