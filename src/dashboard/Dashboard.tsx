import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import type { ViewState } from './types';
import { Overview } from './views/Overview';
import { MyData } from './views/MyData';
import { Activity } from './views/Activity';
import { Settings } from './views/Settings';
import { PersonalDetails } from './views/vault/PersonalDetails';
import { ContactInfo } from './views/vault/ContactInfo';
import { AddressInfo } from './views/vault/AddressInfo';
import { EducationInfo } from './views/vault/EducationInfo';
import { DocumentInfo } from './views/vault/DocumentInfo';
import { ApiKeysInfo } from './views/vault/ApiKeysInfo';
import { SetupVault } from './views/SetupVault';
import { UnlockVault } from './views/UnlockVault';
import { vaultService } from '../shared/services/storage';
import { authService } from '../shared/services/auth';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const checkVaultState = async () => {
    const setup = await vaultService.isVaultSetup();
    setIsSetup(setup);
    if (setup) {
      const key = await authService.getSessionKey();
      setIsUnlocked(!!key);
    }
  };

  useEffect(() => {
    checkVaultState();
    const interval = setInterval(checkVaultState, 3000); // Check periodically for auto-lock
    
    const handleActivity = () => authService.updateActivity();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  const renderVaultGuardedView = (ViewComponent: React.ReactNode) => {
    if (isSetup === null) return null; // loading
    if (!isSetup) return <SetupVault onComplete={checkVaultState} />;
    if (!isUnlocked) return <UnlockVault onComplete={checkVaultState} />;
    return ViewComponent;
  };

  const renderView = () => {
    switch (currentView) {
      case 'overview': return <Overview />;
      case 'activity': return <Activity />;
      case 'settings': return <Settings onVaultChange={checkVaultState} />;
      
      // Vault guarded views
      case 'my-data': return renderVaultGuardedView(<MyData onNavigate={setCurrentView} />);
      case 'vault-personal': return renderVaultGuardedView(<PersonalDetails onNavigate={setCurrentView} />);
      case 'vault-contact': return renderVaultGuardedView(<ContactInfo onNavigate={setCurrentView} />);
      case 'vault-address': return renderVaultGuardedView(<AddressInfo onNavigate={setCurrentView} />);
      case 'vault-education': return renderVaultGuardedView(<EducationInfo onNavigate={setCurrentView} />);
      case 'vault-documents': return renderVaultGuardedView(<DocumentInfo onNavigate={setCurrentView} />);
      case 'vault-apikeys': return renderVaultGuardedView(<ApiKeysInfo onNavigate={setCurrentView} />);
      default: return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header currentView={currentView} />
        
        <div className="flex-1 p-8 overflow-y-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
