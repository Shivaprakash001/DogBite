import { AdminLogin } from '@/components/admin/AdminActions';
import { Card } from '@/components/ui/Card';

export default function AdminLoginPage() {
  return (
    <div className="pt-8">
      <Card>
        <h1 className="mb-4 text-2xl font-extrabold">Admin sign-in</h1>
        <AdminLogin />
      </Card>
    </div>
  );
}
