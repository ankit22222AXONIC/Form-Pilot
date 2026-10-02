import { useState } from 'react';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { vaultService } from '../../shared/services/storage';
import { ShieldCheck } from 'lucide-react';

export function SetupVault({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await vaultService.setupVault(password);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to setup vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6 text-indigo-600">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Secure Your Vault</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Create a strong password to encrypt your personal data. If you forget this password, your data cannot be recovered.
        </p>

        <form onSubmit={handleSetup} className="space-y-4">
          <Input 
            label="Master Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <Input 
            label="Confirm Password" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="pt-2">
            <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Encrypting...' : 'Create Vault'}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
