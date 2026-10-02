import { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { SectionHeading } from '../../../shared/components/SectionHeading';
import { Input } from '../../../shared/components/Input';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { vaultService } from '../../../shared/services/storage';
import type { PersonalDetails as PersonalDetailsType } from '../../../shared/types';
import { ArrowLeft, Save } from 'lucide-react';
import type { ViewState } from '../../types';

export function PersonalDetails({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const [data, setData] = useState<PersonalDetailsType>({
    fullName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    vaultService.getVaultData().then((v) => {
      if (v.personalDetails) {
        setData(v.personalDetails);
      }
    });
  }, []);

  const handleSave = async () => {
    const vault = await vaultService.getVaultData();
    vault.personalDetails = data;
    await vaultService.saveVaultData(vault);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleClear = async () => {
    const vault = await vaultService.getVaultData();
    vault.personalDetails = null;
    await vaultService.saveVaultData(vault);
    setData({
      fullName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onNavigate('my-data')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <SectionHeading title="Personal Details" description="Manage your identity information." />
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" name="fullName" value={data.fullName} onChange={handleChange} disabled={!isEditing} />
          <Input label="First Name" name="firstName" value={data.firstName} onChange={handleChange} disabled={!isEditing} />
          <Input label="Middle Name" name="middleName" value={data.middleName} onChange={handleChange} disabled={!isEditing} />
          <Input label="Last Name" name="lastName" value={data.lastName} onChange={handleChange} disabled={!isEditing} />
          <Input label="Date of Birth" name="dateOfBirth" type="date" value={data.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Gender</label>
            <select
              name="gender"
              value={data.gender || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
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
