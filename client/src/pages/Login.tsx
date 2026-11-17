import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/UI/Card.js';
import { Alert } from '../components/UI/Alert.js';

export const Login: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google Sign-in failed. Please try again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <Card>
        <div className="space-y-6 py-2">
          {error && <Alert type="error">{error}</Alert>}

          <div className="text-center">
            <div className="w-10 h-10 rounded-md bg-signal text-white font-bold text-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              S
            </div>
            <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">Sign in to Synapse 2026</h1>
            <p className="text-sm text-ink-muted mt-2 max-w-xs mx-auto">
              Use your Google account to access your team workspace and competition submissions.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-paper/60 rounded-lg border border-mist">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-in popup was closed or encountered an error.')}
                useOneTap
                theme="outline"
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
              />
            </div>
          </div>

          <div className="text-center text-xs text-ink-muted pt-2 border-t border-mist">
            ISTE &bull; Saturnalia Competition Portal
          </div>
        </div>
      </Card>
    </div>
  );
};
