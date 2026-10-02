import { useState, useEffect } from 'react';
import { Card } from '../../../shared/components/Card';
import { SectionHeading } from '../../../shared/components/SectionHeading';
import { Input } from '../../../shared/components/Input';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { vaultService } from '../../../shared/services/storage';
import type { DocumentInfo as DocumentInfoType } from '../../../shared/types';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import type { ViewState } from '../../types';

export function DocumentInfo({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
  const [data, setData] = useState<DocumentInfoType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DocumentInfoType>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const v = await vaultService.getVaultData();
    setData(v.documents || []);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      documentType: '',
      documentLabel: '',
      referenceNumber: '',
    });
  };

  const handleEdit = (item: DocumentInfoType) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleDelete = async (id: string) => {
    const vault = await vaultService.getVaultData();
    vault.documents = vault.documents.filter(e => e.id !== id);
    await vaultService.saveVaultData(vault);
    loadData();
  };

  const handleSave = async () => {
    const vault = await vaultService.getVaultData();
    if (editingId === 'new') {
      const newItem = { ...editForm, id: Date.now().toString() } as DocumentInfoType;
      vault.documents = [...(vault.documents || []), newItem];
    } else {
      vault.documents = vault.documents.map(e => e.id === editingId ? { ...e, ...editForm } as DocumentInfoType : e);
    }
    await vaultService.saveVaultData(vault);
    setEditingId(null);
    loadData();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onNavigate('my-data')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <SectionHeading title="Documents" description="Reference numbers and labels for optional documents." />
      </div>

      {!editingId ? (
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl border-dashed">
              No document references found.
            </div>
          ) : (
            data.map(item => (
              <Card key={item.id} className="p-5 flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-900">{item.documentLabel}</h4>
                  <p className="text-sm text-gray-600">{item.documentType} {item.referenceNumber ? `• Ref: ${item.referenceNumber}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={18} /></button>
                </div>
              </Card>
            ))
          )}
          <PrimaryButton icon={<Plus size={18} />} onClick={handleAddNew}>Add Document</PrimaryButton>
        </div>
      ) : (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId === 'new' ? 'Add Document' : 'Edit Document'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Document Type" name="documentType" value={editForm.documentType || ''} onChange={handleChange} placeholder="e.g. Passport, License" />
            <Input label="Document Label" name="documentLabel" value={editForm.documentLabel || ''} onChange={handleChange} placeholder="e.g. US Passport" />
            <Input label="Reference Number (Optional)" name="referenceNumber" value={editForm.referenceNumber || ''} onChange={handleChange} className="md:col-span-2" />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <PrimaryButton icon={<Save size={18} />} onClick={handleSave}>Save</PrimaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}
