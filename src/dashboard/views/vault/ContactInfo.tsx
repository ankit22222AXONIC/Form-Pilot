import { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { SectionHeading } from '../../../shared/components/SectionHeading';
import { Input } from '../../../shared/components/Input';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { vaultService } from '../../../shared/services/storage';
import type { ContactInfo as ContactInfoType } from '../../../shared/types';
import { ArrowLeft, Save } from 'lucide-react';
import type { ViewState } from '../../types';

export function ContactInfo({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const [data, setData] = useState<ContactInfoType>({
    email: '',
    phone: '',
    alternatePhone: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    vaultService.getVaultData().then((v) => {
      if (v.contactInfo) {
        setData(v.contactInfo);
      }
    });
  }, []);

  const validate = () => {
    const err: Record<string, string> = {};
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      err.email = 'Invalid email address';
    }
    if (data.phone && !/^\+?[0-9\s-]{7,15}$/.test(data.phone)) {
      err.phone = 'Invalid phone number format';
    }
    if (data.alternatePhone && !/^\+?[0-9\s-]{7,15}$/.test(data.alternatePhone)) {
      err.alternatePhone = 'Invalid phone number format';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const vault = await vaultService.getVaultData();
    vault.contactInfo = data;
    await vaultService.saveVaultData(vault);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleClear = async () => {
    const vault = await vaultService.getVaultData();
    vault.contactInfo = null;
    await vaultService.saveVaultData(vault);
    setData({ email: '', phone: '', alternatePhone: '' });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onNavigate('my-data')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <SectionHeading title="Contact Information" description="How you can be reached." />
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4">
          <Input label="Email Address" name="email" type="email" value={data.email} onChange={handleChange} disabled={!isEditing} error={errors.email} />
          <Input label="Phone Number" name="phone" type="tel" value={data.phone} onChange={handleChange} disabled={!isEditing} error={errors.phone} />
          <Input label="Alternate Phone" name="alternatePhone" type="tel" value={data.alternatePhone} onChange={handleChange} disabled={!isEditing} error={errors.alternatePhone} />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
          {!isEditing ? (
            <PrimaryButton onClick={() => setIsEditing(true)}>Edit Details</PrimaryButton>
          ) : (
            <>
              <button onClick={handleClear} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-auto">
                Clear Fields
              </button>
              <button onClick={() => { setIsEditing(false); setErrors({}); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <PrimaryButton icon={<Save size={18} />} onClick={handleSave}>Save</PrimaryButton>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
