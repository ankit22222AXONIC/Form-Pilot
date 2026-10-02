import { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { SectionHeading } from '../../../shared/components/SectionHeading';
import { Input } from '../../../shared/components/Input';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { vaultService } from '../../../shared/services/storage';
import type { AddressInfo as AddressInfoType } from '../../../shared/types';
import { ArrowLeft, Save } from 'lucide-react';
import type { ViewState } from '../../types';

export function AddressInfo({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const [data, setData] = useState<AddressInfoType>({
    houseNumber: '',
    street: '',
    locality: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    vaultService.getVaultData().then((v) => {
      if (v.addressInfo) {
        setData(v.addressInfo);
      }
    });
  }, []);

  const handleSave = async () => {
    const vault = await vaultService.getVaultData();
    vault.addressInfo = data;
    await vaultService.saveVaultData(vault);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleClear = async () => {
    const vault = await vaultService.getVaultData();
    vault.addressInfo = null;
    await vaultService.saveVaultData(vault);
    setData({ houseNumber: '', street: '', locality: '', city: '', state: '', pinCode: '', country: '' });
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onNavigate('my-data')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <SectionHeading title="Address" description="Your home or primary address." />
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="House/Flat Number" name="houseNumber" value={data.houseNumber} onChange={handleChange} disabled={!isEditing} />
          <Input label="Street" name="street" value={data.street} onChange={handleChange} disabled={!isEditing} />
          <Input label="Locality" name="locality" value={data.locality} onChange={handleChange} disabled={!isEditing} />
          <Input label="City" name="city" value={data.city} onChange={handleChange} disabled={!isEditing} />
          <Input label="State" name="state" value={data.state} onChange={handleChange} disabled={!isEditing} />
          <Input label="PIN Code" name="pinCode" value={data.pinCode} onChange={handleChange} disabled={!isEditing} />
          <Input label="Country" name="country" value={data.country} onChange={handleChange} disabled={!isEditing} className="md:col-span-2" />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
          {!isEditing ? (
            <PrimaryButton onClick={() => setIsEditing(true)}>Edit Details</PrimaryButton>
          ) : (
            <>
              <button onClick={handleClear} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mr-auto">
                Clear Fields
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
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
