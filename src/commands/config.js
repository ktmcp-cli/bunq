import { Command } from 'commander';
import { store, getConfig } from '../config.js';
import { success, info, printKeyValue } from '../output.js';

export function createConfigCommand() {
  const config = new Command('config');
  config.description('Manage CLI configuration and authentication settings');

  // config set
  const setCmd = new Command('set');
  setCmd
    .description('Set configuration values')
    .option('--api-key <key>', 'Your Bunq API key')
    .option('--sandbox', 'Use sandbox environment', false)
    .option('--production', 'Use production environment', false)
    .action((opts) => {
      if (opts.apiKey) {
        store.set('apiKey', opts.apiKey);
        // Clear session when API key changes
        store.delete('sessionToken');
        store.delete('installationToken');
        store.delete('privateKey');
        store.delete('publicKey');
        store.delete('serverPublicKey');
        store.delete('userId');
        success(`API key saved. Run 'bunq auth setup' to complete authentication.`);
      }
      if (opts.sandbox) {
        store.set('sandbox', true);
        success('Switched to sandbox environment.');
      }
      if (opts.production) {
        store.set('sandbox', false);
        success('Switched to production environment.');
      }
      if (!opts.apiKey && !opts.sandbox && !opts.production) {
        info('No options provided. Use --api-key <key>, --sandbox, or --production.');
      }
    });

  // config get
  const getCmd = new Command('get');
  getCmd.description('Show current configuration').action(() => {
    const cfg = getConfig();
    printKeyValue(
      {
        'API Key': cfg.apiKey ? cfg.apiKey.slice(0, 8) + '...' : '(not set)',
        'Environment': cfg.sandbox ? 'sandbox' : 'production',
        'Authenticated': cfg.sessionToken ? 'yes' : 'no',
        'User ID': cfg.userId || '(not set)',
        'Session Token': cfg.sessionToken
          ? cfg.sessionToken.slice(0, 8) + '...'
          : '(not set)',
      },
      'Current Configuration'
    );
  });

  // config clear
  const clearCmd = new Command('clear');
  clearCmd.description('Clear all stored configuration and credentials').action(() => {
    store.clear();
    success('Configuration cleared.');
  });

  config.addCommand(setCmd);
  config.addCommand(getCmd);
  config.addCommand(clearCmd);

  return config;
}
