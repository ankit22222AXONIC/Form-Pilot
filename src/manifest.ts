import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'FormPilot',
  version: '0.1.0',
  description: 'AI-assisted form filling with a privacy-first approach.',
  action: {
    default_popup: 'src/popup/index.html',
  },

  permissions: ['activeTab', 'storage', 'scripting'],
});
