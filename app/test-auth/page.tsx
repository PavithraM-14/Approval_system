'use client';

import { useState } from 'react';

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Step 1: Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@dmas.com',
          password: 'adminPassword123'
        })
      });

      const loginData = await loginResponse.json();
      
      setResult((prev: any) => ({
        ...prev,
        login: {
          status: loginResponse.status,
          ok: loginResponse.ok,
          data: loginData,
          headers: Object.fromEntries(loginResponse.headers.entries())
        }
      }));

      if (!loginResponse.ok) {
        setLoading(false);
        return;
      }

      // Step 2: Test /api/auth/me
      const meResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      const meData = await meResponse.json();
      
      setResult((prev: any) => ({
        ...prev,
        me: {
          status: meResponse.status,
          ok: meResponse.ok,
          data: meData
        }
      }));

      // Step 3: Check cookies (both document.cookie and via API)
      const documentCookies = document.cookie;
      
      // Try to read cookies via another API call
      const testResponse = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      setResult((prev: any) => ({
        ...prev,
        cookies: {
          documentCookie: documentCookies || 'No cookies in document.cookie',
          meApiWorked: testResponse.ok,
          meApiStatus: testResponse.status
        }
      }));

    } catch (error: any) {
      setResult((prev: any) => ({
        ...prev,
        error: error.message
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Authentication Test</h1>
        
        <button
          onClick={testLogin}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Login Flow'}
        </button>

        {result && (
          <div className="mt-8 space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Results:</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
