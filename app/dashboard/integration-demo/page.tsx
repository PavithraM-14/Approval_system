'use client';

import { useState } from 'react';
import { 
  BuildingOffice2Icon, 
  UsersIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function IntegrationDemoPage() {
  const [activeTab, setActiveTab] = useState<'odoo' | 'crm' | 'hrm'>('odoo');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mock data
  const mockInvoices = [
    { id: '1', name: 'INV-2024-001', company: 'ABC Corporation', amount: '$15,000' },
    { id: '2', name: 'INV-2024-002', company: 'XYZ Limited', amount: '$8,500' },
    { id: '3', name: 'INV-2024-003', company: 'DEF Industries', amount: '$12,300' },
    { id: '4', name: 'INV-2024-004', company: 'GHI Enterprises', amount: '$25,000' },
    { id: '5', name: 'INV-2024-005', company: 'JKL Solutions', amount: '$6,750' },
  ];

  const mockPurchaseOrders = [
    { id: 'po1', name: 'PO-2024-001', company: 'Tech Supplies Inc.', amount: '$45,000' },
    { id: 'po2', name: 'PO-2024-002', company: 'Office Equipment Ltd.', amount: '$18,500' },
    { id: 'po3', name: 'PO-2024-003', company: 'Software Vendors Co.', amount: '$32,000' },
    { id: 'po4', name: 'PO-2024-004', company: 'Hardware Solutions', amount: '$67,500' },
    { id: 'po5', name: 'PO-2024-005', company: 'Furniture Depot', amount: '$22,300' },
  ];

  const mockContacts = [
    { id: 'c1', name: 'John Doe', title: 'CEO', company: 'ABC Corporation', email: 'john.doe@abccorp.com' },
    { id: 'c2', name: 'Jane Smith', title: 'CFO', company: 'XYZ Limited', email: 'jane.smith@xyzltd.com' },
    { id: 'c3', name: 'Michael Brown', title: 'Procurement Manager', company: 'DEF Industries', email: 'michael.brown@defindustries.com' },
    { id: 'c4', name: 'Sarah Johnson', title: 'Operations Director', company: 'GHI Enterprises', email: 'sarah.johnson@ghient.com' },
    { id: 'c5', name: 'David Williams', title: 'VP of Sales', company: 'JKL Solutions', email: 'david.williams@jklsolutions.com' },
    { id: 'c6', name: 'Emily Davis', title: 'Marketing Manager', company: 'Tech Corporation', email: 'emily.davis@techcorp.com' },
  ];

  const mockEmployees = [
    { id: 'e1', name: 'Alice Johnson', empId: 'EMP001', title: 'Senior Software Engineer', department: 'Engineering' },
    { id: 'e2', name: 'Bob Williams', empId: 'EMP002', title: 'HR Manager', department: 'Human Resources' },
    { id: 'e3', name: 'Carol Davis', empId: 'EMP003', title: 'Financial Analyst', department: 'Finance' },
    { id: 'e4', name: 'Daniel Martinez', empId: 'EMP004', title: 'Marketing Specialist', department: 'Marketing' },
    { id: 'e5', name: 'Emma Garcia', empId: 'EMP005', title: 'Operations Manager', department: 'Operations' },
    { id: 'e6', name: 'Frank Rodriguez', empId: 'EMP006', title: 'Sales Director', department: 'Sales' },
    { id: 'e7', name: 'Grace Lee', empId: 'EMP007', title: 'Product Manager', department: 'Product' },
  ];

  const handleSelect = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integration Demo</h1>
        <p className="text-gray-600">
          This page demonstrates how S.E.A.D. integrates with Odoo ERP, SuiteCRM, and OrangeHRM
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo Mode:</strong> This page shows mock/sample data to demonstrate the integration functionality.
            In production, this would connect to real Odoo, SuiteCRM, and OrangeHRM instances.
          </p>
        </div>
      </div>

      {/* Request Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sample Request #123456</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Title</p>
            <p className="font-medium">Purchase Request for Equipment</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium text-blue-600">VP Approval</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Requester</p>
            <p className="font-medium">John Smith</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className="font-medium text-green-600">$45,000</p>
          </div>
        </div>

        {/* Selected Items Display */}
        {selectedItems.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3">Linked External Records:</h3>
            <div className="space-y-2">
              {selectedItems.map(id => {
                const invoice = mockInvoices.find(i => i.id === id);
                const po = mockPurchaseOrders.find(p => p.id === id);
                const contact = mockContacts.find(c => c.id === id);
                const employee = mockEmployees.find(e => e.id === id);

                if (invoice) {
                  return (
                    <div key={id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-medium">Odoo Invoice #{invoice.name}</div>
                          <div className="text-sm text-gray-600">{invoice.company} • {invoice.amount}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelect(id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                if (po) {
                  return (
                    <div key={id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-medium">Odoo Purchase Order #{po.name}</div>
                          <div className="text-sm text-gray-600">{po.company} • {po.amount}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelect(id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                if (contact) {
                  return (
                    <div key={id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <UsersIcon className="w-6 h-6 text-purple-600" />
                        <div>
                          <div className="font-medium">CRM Contact: {contact.name}</div>
                          <div className="text-sm text-gray-600">{contact.title} • {contact.company}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelect(id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                if (employee) {
                  return (
                    <div key={id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="w-6 h-6 text-orange-600" />
                        <div>
                          <div className="font-medium">HRM Employee: {employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.title} • {employee.department}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelect(id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Integration Modal Simulation */}
      <div className="bg-white rounded-lg shadow-xl">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Link to External System</h2>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {activeTab === 'odoo' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-lg">Purchase Orders</h3>
                <div className="space-y-2">
                  {mockPurchaseOrders.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => handleSelect(po.id)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition ${
                        selectedItems.includes(po.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-lg">{po.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {po.company} • {po.amount}
                          </div>
                        </div>
                        {selectedItems.includes(po.id) && (
                          <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-lg">Invoices</h3>
                <div className="space-y-2">
                  {mockInvoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => handleSelect(invoice.id)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition ${
                        selectedItems.includes(invoice.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-lg">{invoice.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {invoice.company} • {invoice.amount}
                          </div>
                        </div>
                        {selectedItems.includes(invoice.id) && (
                          <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div>
              <h3 className="font-semibold mb-3 text-lg">Contacts</h3>
              <div className="space-y-2">
                {mockContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelect(contact.id)}
                    className={`w-full text-left p-4 border-2 rounded-lg transition ${
                      selectedItems.includes(contact.id)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-lg">{contact.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {contact.title} • {contact.company}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{contact.email}</div>
                      </div>
                      {selectedItems.includes(contact.id) && (
                        <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hrm' && (
            <div>
              <h3 className="font-semibold mb-3 text-lg">Employees</h3>
              <div className="space-y-2">
                {mockEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => handleSelect(employee.id)}
                    className={`w-full text-left p-4 border-2 rounded-lg transition ${
                      selectedItems.includes(employee.id)
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-lg">
                          {employee.name} ({employee.empId})
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {employee.title} • {employee.department}
                        </div>
                      </div>
                      {selectedItems.includes(employee.id) && (
                        <CheckCircleIcon className="w-6 h-6 text-orange-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">How to Use This Demo:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Click on any invoice, purchase order, contact, or employee to "link" it</li>
          <li>Selected items will appear in the "Linked External Records" section above</li>
          <li>Click the X button to unlink an item</li>
          <li>Switch between tabs to see different integration types</li>
          <li>This demonstrates how S.E.A.D. connects to multiple business systems</li>
        </ol>
      </div>
    </div>
  );
}
