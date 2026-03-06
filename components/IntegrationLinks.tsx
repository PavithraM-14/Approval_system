'use client';

import { useState, useEffect } from 'react';
import { 
  BuildingOffice2Icon, 
  UsersIcon, 
  DocumentTextIcon, 
  LinkIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface IntegrationLinksProps {
  requestId: string;
  onLink?: (type: string, id: string) => void;
}

export default function IntegrationLinks({ requestId, onLink }: IntegrationLinksProps) {
  const [activeTab, setActiveTab] = useState<'odoo' | 'crm' | 'hrm'>('odoo');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Odoo state
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // CRM state
  const [contacts, setContacts] = useState<any[]>([]);

  // HRM state
  const [employees, setEmployees] = useState<any[]>([]);

  const loadOdooData = async () => {
    setLoading(true);
    try {
      const [ordersRes, invoicesRes, partnersRes] = await Promise.all([
        fetch('/api/odoo/purchase-orders'),
        fetch('/api/odoo/invoices'),
        fetch('/api/odoo/partners'),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setPurchaseOrders(data.data || []);
        if (data.source === 'mock') {
          console.log('📊 Using demo data for Odoo');
        }
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.data || []);
      }

      if (partnersRes.ok) {
        const data = await partnersRes.json();
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load Odoo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCRMData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suitecrm/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHRMData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orangehrm/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load HRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      if (activeTab === 'odoo') {
        loadOdooData();
      } else if (activeTab === 'crm') {
        loadCRMData();
      } else if (activeTab === 'hrm') {
        loadHRMData();
      }
    }
  }, [activeTab, showModal]);

  const handleLink = (type: string, id: string) => {
    if (onLink) {
      onLink(type, id);
    }
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <LinkIcon className="w-4 h-4" />
        Link to ERP/CRM/HR
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Link to External System</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('odoo')}
                className={`flex items-center gap-2 px-6 py-3 ${
                  activeTab === 'odoo'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BuildingOffice2Icon className="w-4 h-4" />
                Odoo ERP
              </button>
              <button
                onClick={() => setActiveTab('crm')}
                className={`flex items-center gap-2 px-6 py-3 ${
                  activeTab === 'crm'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                SuiteCRM
              </button>
              <button
                onClick={() => setActiveTab('hrm')}
                className={`flex items-center gap-2 px-6 py-3 ${
                  activeTab === 'hrm'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4" />
                OrangeHRM
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <>
                  {activeTab === 'odoo' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-3">Purchase Orders</h3>
                        <div className="space-y-2">
                          {purchaseOrders.map((order) => (
                            <button
                              key={order.id}
                              onClick={() => handleLink('odoo_po', order.id.toString())}
                              className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="font-medium">{order.name}</div>
                              <div className="text-sm text-gray-600">
                                {order.partner_id?.[1]} • {order.amount_total} {order.currency_id?.[1]}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Invoices</h3>
                        <div className="space-y-2">
                          {invoices.map((invoice) => (
                            <button
                              key={invoice.id}
                              onClick={() => handleLink('odoo_invoice', invoice.id.toString())}
                              className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="font-medium">{invoice.name}</div>
                              <div className="text-sm text-gray-600">
                                {invoice.partner_id?.[1]} • {invoice.amount_total} {invoice.currency_id?.[1]}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'crm' && (
                    <div>
                      <h3 className="font-semibold mb-3">Contacts</h3>
                      <div className="space-y-2">
                        {contacts.map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => handleLink('crm_contact', contact.id)}
                            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {contact.email} • {contact.account_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'hrm' && (
                    <div>
                      <h3 className="font-semibold mb-3">Employees</h3>
                      <div className="space-y-2">
                        {employees.map((employee) => (
                          <button
                            key={employee.empNumber}
                            onClick={() => handleLink('hrm_employee', employee.empNumber.toString())}
                            className="w-full text-left p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {employee.employeeId} • {employee.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
