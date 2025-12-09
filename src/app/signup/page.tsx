import { redirect } from 'next/navigation';

export default function SignupPage() {
  // Signup is disabled - administrator will manage user creation
  redirect('/login');
}
