import React from 'react';
import { rbacService } from '../services/rbac';
import { Crown, User, Key, Mail } from 'lucide-react';

const LoginInfo: React.FC = () => {
  const facilitators = rbacService.getFacilitators();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IdeaFlow Access Information</h1>
          <p className="text-gray-600">Login credentials for testing the platform</p>
        </div>

        {/* Facilitator Accounts */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Crown className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">Facilitator Accounts</h2>
            <span className="text-sm text-gray-500">(Can create and manage sessions)</span>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilitators.map((facilitator) => (
              <div key={facilitator.username} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-medium text-gray-900">{facilitator.displayName}</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Username:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {facilitator.username}
                    </code>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Password:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {facilitator.password}
                    </code>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Email:</span>
                    <span className="text-xs text-gray-500">{facilitator.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participant Information */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Participant Accounts</h2>
            <span className="text-sm text-gray-500">(Can join sessions and submit ideas)</span>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Self-Registration Required</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Participants must create their own accounts using the registration form. 
                Choose any username and password to get started.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Participant accounts are created in real-time when registering. 
                  Each participant will have their own unique username and can join sessions using session IDs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">System Features</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Facilitator Capabilities:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Create new ideation sessions</li>
                <li>• View real participant names</li>
                <li>• Control session phases</li>
                <li>• Access facilitator dashboard</li>
                <li>• Share session IDs with participants</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Participant Capabilities:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Join sessions using session ID</li>
                <li>• Submit ideas anonymously</li>
                <li>• Vote on submitted ideas</li>
                <li>• Participate in real-time collaboration</li>
                <li>• View session progress</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginInfo;