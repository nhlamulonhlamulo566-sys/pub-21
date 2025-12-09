
import { AddUserForm } from '@/components/settings/add-user-form';

export default function AddUserPage() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Add New User</h1>
      </div>
      <AddUserForm />
    </div>
  );
}
