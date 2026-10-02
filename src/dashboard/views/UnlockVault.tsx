import { useState } from 'react';
import { Card } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { vaultService } from '../../shared/services/storage';
import { authService } from '../../shared/services/auth';
import { cryptoService } from '../../shared/services/crypto';
import { Lock } from 'lucide-react';

export function UnlockVault({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const salt = await vaultService.getSalt();
      if (!salt) throw new Error('Vault is not setup.');
      
      const key = await cryptoService.deriveKey(password, salt);
      await authService.setSessionKey(key);
      
      // Verify key by attempting to decrypt the vault
      try {
        await vaultService.getVaultData();
        onComplete();
      } catch (_decErr) {
        // If decryption fails, the key is wrong. Clear session key.
        await authService.lockVault();
        throw new Error('Incorrect password.');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to unlock vault');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6 text-gray-800">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Vault Locked</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your master password to decrypt and access your personal data.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <Input 
            label="Master Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            autoFocus
          />
          
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="pt-2">
            <PrimaryButton type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Decrypting...' : 'Unlock Vault'}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
