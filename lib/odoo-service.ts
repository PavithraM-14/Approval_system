/**
 * Odoo ERP Integration Service
 * Handles purchase orders, invoices, and inventory management
 */

interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

interface OdooRecord {
  id: number;
  [key: string]: any;
}

export class OdooClient {
  private config: OdooConfig;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Odoo
   */
  async authenticate(): Promise<number> {
    const response = await fetch(`${this.config.url}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: this.config.db,
          login: this.config.username,
          password: this.config.password,
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Odoo authentication failed: ${data.error.message}`);
    }

    if (!data.result?.uid) {
      throw new Error('Odoo authentication failed: No UID returned');
    }

    this.uid = data.result.uid;
    return this.uid;
  }

  /**
   * Execute Odoo RPC call
   */
  private async call(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {}
  ): Promise<any> {
    if (!this.uid) {
      await this.authenticate();
    }

    if (!this.uid) {
      throw new Error('Authentication failed: No UID available');
    }

    const response = await fetch(`${this.config.url}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model,
          method,
          args,
          kwargs,
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Odoo RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Search for records
   */
  async search(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    limit: number = 100
  ): Promise<OdooRecord[]> {
    return await this.call(model, 'search_read', [domain], {
      fields,
      limit,
    });
  }

  /**
   * Create record
   */
  async create(model: string, values: any): Promise<number> {
    return await this.call(model, 'create', [values]);
  }

  /**
   * Update record
   */
  async update(model: string, id: number, values: any): Promise<boolean> {
    return await this.call(model, 'write', [[id], values]);
  }

  /**
   * Delete record
   */
  async delete(model: string, id: number): Promise<boolean> {
    return await this.call(model, 'unlink', [[id]]);
  }

  /**
   * Get purchase orders
   */
  async getPurchaseOrders(filters: any = {}): Promise<OdooRecord[]> {
    const domain: any[] = [];
    
    if (filters.state) {
      domain.push(['state', '=', filters.state]);
    }
    
    if (filters.partnerId) {
      domain.push(['partner_id', '=', filters.partnerId]);
    }

    return await this.search('purchase.order', domain, [
      'name',
      'partner_id',
      'date_order',
      'amount_total',
      'state',
      'currency_id',
    ]);
  }

  /**
   * Get invoices
   */
  async getInvoices(filters: any = {}): Promise<OdooRecord[]> {
    const domain: any[] = [['move_type', '=', 'out_invoice']];
    
    if (filters.state) {
      domain.push(['state', '=', filters.state]);
    }
    
    if (filters.partnerId) {
      domain.push(['partner_id', '=', filters.partnerId]);
    }

    return await this.search('account.move', domain, [
      'name',
      'partner_id',
      'invoice_date',
      'amount_total',
      'state',
      'currency_id',
    ]);
  }

  /**
   * Create invoice
   */
  async createInvoice(data: {
    partnerId: number;
    invoiceDate: string;
    lines: Array<{
      productId: number;
      quantity: number;
      priceUnit: number;
    }>;
  }): Promise<number> {
    const invoiceLines = data.lines.map(line => [0, 0, {
      product_id: line.productId,
      quantity: line.quantity,
      price_unit: line.priceUnit,
    }]);

    return await this.create('account.move', {
      partner_id: data.partnerId,
      move_type: 'out_invoice',
      invoice_date: data.invoiceDate,
      invoice_line_ids: invoiceLines,
    });
  }

  /**
   * Get products
   */
  async getProducts(search?: string): Promise<OdooRecord[]> {
    const domain: any[] = [];
    
    if (search) {
      domain.push(['name', 'ilike', search]);
    }

    return await this.search('product.product', domain, [
      'name',
      'default_code',
      'list_price',
      'standard_price',
      'qty_available',
    ]);
  }

  /**
   * Get partners (customers/vendors)
   */
  async getPartners(search?: string): Promise<OdooRecord[]> {
    const domain: any[] = [];
    
    if (search) {
      domain.push(['name', 'ilike', search]);
    }

    return await this.search('res.partner', domain, [
      'name',
      'email',
      'phone',
      'street',
      'city',
      'country_id',
    ]);
  }

  /**
   * Link document to purchase order
   */
  async linkDocumentToPurchaseOrder(
    purchaseOrderId: number,
    documentName: string,
    documentUrl: string
  ): Promise<number> {
    return await this.create('ir.attachment', {
      name: documentName,
      res_model: 'purchase.order',
      res_id: purchaseOrderId,
      type: 'url',
      url: documentUrl,
    });
  }
}

/**
 * Get Odoo client instance
 */
export function getOdooClient(): OdooClient {
  const config: OdooConfig = {
    url: process.env.ODOO_URL || 'http://localhost:8069',
    db: process.env.ODOO_DB || 'sead_erp',
    username: process.env.ODOO_USERNAME || 'admin',
    password: process.env.ODOO_PASSWORD || 'admin',
  };

  return new OdooClient(config);
}
