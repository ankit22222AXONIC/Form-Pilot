import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'FormPilot',
  version: '0.1.0',
  description: 'AI-assisted form filling with a privacy-first approach.',
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: 'favicon.svg',
  },
  icons: {
    '48': 'favicon.svg',
  },
  permissions: ['activeTab', 'storage', 'scripting'],
});
