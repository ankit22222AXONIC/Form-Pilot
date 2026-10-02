import { useState, useEffect } from 'react';
import { Card } from '../../shared/components/Card';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { authService } from '../../shared/services/auth';
import { vaultService } from '../../shared/services/storage';

interface SettingsProps {
  onVaultChange?: () => void;
}

export function Settings({ onVaultChange }: SettingsProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [aiConfig, setAiConfig] = useState({ provider: 'openai', apiKey: '', model: 'gpt-4o-mini' });
  const [isAiConfigSaving, setIsAiConfigSaving] = useState(false);
  const [aiConfigSuccess, setAiConfigSuccess] = useState<string | false>(false);
  useEffect(() => {
    authService.getSessionKey().then(key => setIsLocked(!key));
    import('../../shared/services/ai').then(({ aiService }) => {
      aiService.getConfig().then(setAiConfig);
    });
  }, []);

  const handleLockNow = async () => {
    await authService.lockVault();
    setIsLocked(true);
    if (onVaultChange) onVaultChange();
  };

  const handleClearAll = async () => {
    await vaultService.clearVaultData();
    setShowClearConfirm(false);
    if (onVaultChange) onVaultChange();
  };

  const handleAutoLockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mins = parseInt(e.target.value);
    setAutoLockMinutes(mins);
    authService.setAutoLockTimeout(mins);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      await vaultService.changePassword(oldPassword, newPassword);
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiConfigSaving(true);
    setAiConfigSuccess(false);
    try {
      const { aiService } = await import('../../shared/services/ai');
      await aiService.saveConfig(aiConfig as any);
      setAiConfigSuccess('Configuration saved successfully!');
      setTimeout(() => setAiConfigSuccess(false), 3000);
    } catch (_err) {
      setAiConfigSuccess('Error saving configuration.');
    } finally {
      setIsAiConfigSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsAiConfigSaving(true);
    setAiConfigSuccess(false);
    try {
      const { aiService } = await import('../../shared/services/ai');
      await aiService.removeConfig();
      setAiConfig({ provider: 'openai', apiKey: '', model: 'gpt-4o-mini' });
      setAiConfigSuccess('API key and configuration removed.');
      setTimeout(() => setAiConfigSuccess(false), 3000);
    } catch (_err) {
      setAiConfigSuccess('Error removing configuration.');
    } finally {
      setIsAiConfigSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <SectionHeading 
          title="Settings" 
          description="Configure extension behavior and privacy preferences." 
        />
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Privacy & Security</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Vault Status</p>
                <p className="text-sm text-gray-500">
                  {isLocked ? 'Your vault is currently locked.' : 'Your vault is currently unlocked.'}
                </p>
              </div>
              <button 
                onClick={handleLockNow}
                disabled={isLocked}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isLocked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {isLocked ? 'Locked' : 'Lock Now'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto-lock Timeout</p>
                <p className="text-sm text-gray-500">Lock vault after inactivity</p>
              </div>
              <select
                value={autoLockMinutes}
                onChange={handleAutoLockChange}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-500">Update your master password.</p>
                </div>
                <button 
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {isChangingPassword ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {passwordSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm mb-4">
                  Password updated successfully.
                </div>
              )}

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  {passwordError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{passwordError}</div>}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                      minLength={8}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Delete All Data</p>
                <p className="text-sm text-gray-500">Permanently remove your encrypted vault and password.</p>
              </div>
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Clear Vault
              </button>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading title="AI Provider Configuration" description="Configure the AI engine for form analysis." />
        <Card className="p-6">
          <form onSubmit={handleSaveAiConfig} className="space-y-6">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
              <strong>Privacy Notice:</strong> When AI analysis is activated, the labels and metadata of the current form will be sent to the configured provider. Your locally saved vault data is <strong>never</strong> transmitted.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={aiConfig.provider}
                onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="openai">OpenAI</option>
                <option value="sarvam">Sarvam AI</option>
                <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder={aiConfig.provider === 'sarvam' ? "Enter api-subscription-key" : "sk-..."}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-xs text-gray-500 mt-1">Stored in extension local storage. Not encrypted — avoid sharing your browser profile.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                placeholder={aiConfig.provider === 'sarvam' ? "sarvam-105b" : "gpt-4o-mini"}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <span className={`text-sm font-medium ${aiConfigSuccess ? ((aiConfigSuccess as string).startsWith('Error') ? 'text-red-600' : 'text-green-600') : ''}`}>
                {aiConfigSuccess}
              </span>
              <div className="flex gap-2">
                {aiConfig.apiKey && (
                  <button
                    type="button"
                    onClick={handleRemoveApiKey}
                    disabled={isAiConfigSaving}
                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Remove Key
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setIsAiConfigSaving(true);
                    setAiConfigSuccess('');
                    try {
                      const { aiService } = await import('../../shared/services/ai');
                      await aiService.testConnection(aiConfig as any);
                      setAiConfigSuccess('Connection successful!');
                    } catch (err: any) {
                      setAiConfigSuccess(`Error: ${err.message}`);
                    } finally {
                      setIsAiConfigSaving(false);
                      setTimeout(() => setAiConfigSuccess(''), 5000);
                    }
                  }}
                  disabled={isAiConfigSaving || !aiConfig.apiKey}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Test Connection
                </button>
                <button 
                  type="submit"
                  disabled={isAiConfigSaving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isAiConfigSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </form>
        </Card>
      </section>

      <section>
        <SectionHeading title="About FormPilot" />
        <Card className="p-6">
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong className="text-gray-900">Version:</strong> 0.1.0-alpha (Phase 04)</p>
            <p><strong className="text-gray-900">Status:</strong> Encrypted Vault Mode</p>
            <p className="mt-4 text-xs text-gray-400">© 2026 FormPilot. Privacy-first by design.</p>
          </div>
        </Card>
      </section>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Clear all vault data?</h3>
            <p className="text-gray-600 text-sm">
              This action cannot be undone. Your password and all encrypted information will be permanently deleted from this device. If you lose your password, there is no way to recover this data.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
