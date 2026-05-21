import { CircularProgress } from '@mui/material';
import { Suspense } from 'react';
import { LoginContent } from './login-content';

export default function LoginPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <LoginContent />
    </Suspense>
  );
}

