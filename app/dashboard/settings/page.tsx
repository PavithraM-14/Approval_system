'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data); // Handle both wrapped and unwrapped responses
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const response = await fetch('/api/gmail/auth');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Google:', error);
      alert('Failed to connect Google account');
    } finally {
      setConnecting(false);
    }
  };

  const handleTestEmail = async () => {
    const email = prompt('Enter email address to send test email:');
    if (!email) return;

    try {
      const response = await fetch('/api/gmail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Test email sent successfully to ${email}!\nMessage ID: ${data.messageId}`);
      } else {
        alert(`Failed to send test email: ${data.error}\n${data.details || ''}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* User Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="space-y-3">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{user?.name}</span>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>
            <span className="ml-2 font-medium">{user?.email}</span>
          </div>
          <div>
            <span className="text-gray-600">Employee ID:</span>
            <span className="ml-2 font-medium">{user?.empId}</span>
          </div>
          <div>
            <span className="text-gray-600">Role:</span>
            <span className="ml-2 font-medium">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Google Integration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Google Integration</h2>
        
        <div className="space-y-4">
          {/* Gmail Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Gmail</h3>
              <p className="text-sm text-gray-600">
                {user?.gmailEnabled 
                  ? 'Connected - You can send emails and import attachments'
                  : 'Not connected - Connect to enable email features'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.gmailEnabled ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Connected
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-medium">
                  Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Google Drive Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium">Google Drive</h3>
              <p className="text-sm text-gray-600">
                {user?.driveEnabled 
                  ? 'Connected - You can edit documents in Google Workspace'
                  : 'Not connected - Connect to enable document editing'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.driveEnabled ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Connected
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-medium">
                  Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Connect Button */}
          {(!user?.gmailEnabled || !user?.driveEnabled) && (
            <div className="pt-4">
              <button
                onClick={handleConnectGoogle}
                disabled={connecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect Google Account
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2 text-center">
                This will enable Gmail and Google Drive features
              </p>
            </div>
          )}

          {/* Test Email Button */}
          {user?.gmailEnabled && (
            <div className="pt-4">
              <button
                onClick={handleTestEmail}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Test Email
              </button>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Test your Gmail connection by sending a test email
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Features enabled with Google connection:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Send documents via email</li>
              <li>• Import email attachments automatically</li>
              <li>• Edit Office documents in Google Workspace</li>
              <li>• Collaborative document editing</li>
              <li>• Convert documents to Google Docs/Sheets/Slides</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
