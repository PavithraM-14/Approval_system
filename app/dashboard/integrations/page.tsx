'use client';

import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'testing';
  endpoint: string;
  description: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      name: 'Gmail',
      status: 'disconnected',
      endpoint: '/api/gmail/test',
      description: 'Send emails and import attachments'
    },
    {
      name: 'Google Drive',
      status: 'disconnected',
      endpoint: '/api/auth/me',
      description: 'Edit documents in Google Workspace'
    },
    {
      name: 'Odoo ERP',
      status: 'disconnected',
      endpoint: '/api/odoo/partners',
      description: 'Invoices, purchase orders, partners'
    },
    {
      name: 'SuiteCRM',
      status: 'disconnected',
      endpoint: '/api/suitecrm/contacts',
      description: 'Customer contacts and documents'
    },
    {
      name: 'OrangeHRM',
      status: 'disconnected',
      endpoint: '/api/orangehrm/employees',
      description: 'Employee records and HR documents'
    }
  ]);

  const testIntegration = async (index: number) => {
    const newIntegrations = [...integrations];
    newIntegrations[index].status = 'testing';
    setIntegrations(newIntegrations);

    try {
      const response = await fetch(integrations[index].endpoint, {
        credentials: 'include'
      });

      newIntegrations[index].status = response.ok ? 'connected' : 'disconnected';
    } catch (error) {
      newIntegrations[index].status = 'disconnected';
    }

    setIntegrations(newIntegrations);
  };

  const testAllIntegrations = async () => {
    for (let i = 0; i < integrations.length; i++) {
      await testIntegration(i);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Integrations</h1>
          <p className="text-gray-600 mt-2">Connect S.E.A.D. with your existing business systems</p>
        </div>
        <button
          onClick={testAllIntegrations}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Test All Connections
        </button>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {integrations.map((integration, index) => (
          <div key={integration.name} className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-blue-400 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{integration.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
              </div>
              {integration.status === 'connected' && (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              )}
              {integration.status === 'disconnected' && (
                <XCircleIcon className="h-8 w-8 text-red-600" />
              )}
              {integration.status === 'testing' && (
                <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                integration.status === 'connected' ? 'bg-green-100 text-green-800' :
                integration.status === 'testing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {integration.status === 'connected' ? 'Connected' :
                 integration.status === 'testing' ? 'Testing...' :
                 'Not Connected'}
              </span>
              <button
                onClick={() => testIntegration(index)}
                disabled={integration.status === 'testing'}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">Why Integrate?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">📧 Email & Collaboration</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Send documents via Gmail</li>
              <li>• Import email attachments</li>
              <li>• Edit in Google Workspace</li>
              <li>• Collaborative document editing</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🏢 Business Systems</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Auto-import invoices from Odoo</li>
              <li>• Link documents to CRM contacts</li>
              <li>• Sync employee HR documents</li>
              <li>• Eliminate manual data entry</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
        
        <div className="space-y-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <h3 className="font-medium">Gmail & Google Drive</h3>
            <p className="text-sm text-gray-600 mt-1">
              Go to Settings → Click "Connect Google Account" → Authorize access
            </p>
          </div>

          <div className="border-l-4 border-green-600 pl-4">
            <h3 className="font-medium">Odoo ERP</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure in .env.local: ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD
            </p>
          </div>

          <div className="border-l-4 border-purple-600 pl-4">
            <h3 className="font-medium">SuiteCRM</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure in .env.local: SUITECRM_URL, SUITECRM_USERNAME, SUITECRM_PASSWORD
            </p>
          </div>

          <div className="border-l-4 border-orange-600 pl-4">
            <h3 className="font-medium">OrangeHRM</h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure in .env.local: ORANGEHRM_URL, ORANGEHRM_USERNAME, ORANGEHRM_PASSWORD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
