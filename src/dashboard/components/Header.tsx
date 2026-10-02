import type { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
}

export function Header({ currentView }: HeaderProps) {
  const titles: Record<ViewState, string> = {
    'overview': 'Overview',
    'my-data': 'Personal Data Vault',
    'activity': 'Recent Activity',
    'settings': 'Settings',
    'vault-personal': 'Personal Details',
    'vault-contact': 'Contact Information',
    'vault-address': 'Address',
    'vault-education': 'Education',
    'vault-documents': 'Documents',
    'vault-apikeys': 'API Keys',
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-2xl font-semibold text-gray-900">{titles[currentView]}</h1>
    </header>
  );
}
