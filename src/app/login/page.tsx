import { LoginForm } from '@/components/auth/login-form';
import { Package2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2 text-foreground">
        <Package2 className="h-8 w-8 text-primary" />
        <span className="text-2xl font-semibold">PUB 21</span>
      </div>
      <LoginForm />
    </div>
  );
}
