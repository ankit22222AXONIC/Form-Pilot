import { Card } from '../../shared/components/Card';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { User, Mail, MapPin, GraduationCap, FileText, ChevronRight, Trash2, Key } from 'lucide-react';
import type { ViewState } from '../types';
import { vaultService } from '../../shared/services/storage';
import { useState } from 'react';

interface MyDataProps {
  onNavigate: (view: ViewState) => void;
}

export function MyData({ onNavigate }: MyDataProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const categories: { id: ViewState; title: string; description: string; icon: any }[] = [
    { id: 'vault-personal', title: 'Personal Details', description: 'Name, date of birth, identity numbers', icon: <User size={20} /> },
    { id: 'vault-contact', title: 'Contact Information', description: 'Emails, phone numbers, social links', icon: <Mail size={20} /> },
    { id: 'vault-address', title: 'Address', description: 'Home, billing, and shipping addresses', icon: <MapPin size={20} /> },
    { id: 'vault-education', title: 'Education', description: 'Degrees, certifications, institutions', icon: <GraduationCap size={20} /> },
    { id: 'vault-documents', title: 'Documents', description: 'Resumes, cover letters, references', icon: <FileText size={20} /> },
    { id: 'vault-apikeys', title: 'API Keys', description: 'Tokens, secrets, API keys', icon: <Key size={20} /> },
  ];

  const handleClearAll = async () => {
    await vaultService.clearVaultData();
    setShowClearConfirm(false);
    // Optionally trigger a toast here
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeading 
          title="Your Information" 
          description="Manage the data FormPilot uses to assist you. All information here remains encrypted locally on your device." 
        />
        <button 
          onClick={() => setShowClearConfirm(true)}
          className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          Clear all data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-5 flex items-start gap-4" onClick={() => onNavigate(cat.id)}>
              <div className="p-2.5 bg-gray-50 rounded-lg text-gray-700">
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{cat.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
              </div>
              <div className="flex items-center text-gray-400">
                <ChevronRight size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Clear all vault data?</h3>
            <p className="text-gray-600 text-sm">
              This action cannot be undone. All your saved information will be permanently deleted from your device.
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
