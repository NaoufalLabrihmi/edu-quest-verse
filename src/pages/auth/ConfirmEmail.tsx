import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

const ConfirmEmail = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // If user is already confirmed, redirect to dashboard
    if (user?.email_confirmed_at) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent you an email with a link to verify your account.
            Please check your inbox and click the link to continue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail; 