import { Command } from 'commander';
import crypto from 'crypto';
import ora from 'ora';
import { store, getConfig, getBaseUrl } from '../config.js';
import { bunqPost } from '../client.js';
import { success, error, info, printKeyValue, handleError } from '../output.js';

/**
 * Bunq authentication is a 3-step process:
 * 1. POST /installation - Register RSA public key, get installation token
 * 2. POST /device-server - Register this device using the installation token
 * 3. POST /session-server - Create a session, get session token for API calls
 */
async function setupAuth() {
  const config = getConfig();

  if (!config.apiKey) {
    error('No API key configured. Run: bunq config set --api-key <key>');
    process.exit(1);
  }

  const spinner = ora('Setting up Bunq authentication...').start();

  try {
    // Step 1: Generate RSA key pair
    spinner.text = 'Generating RSA key pair...';
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    store.set('privateKey', privateKey);
    store.set('publicKey', publicKey);

    // Step 2: POST /installation
    spinner.text = 'Registering installation with Bunq...';
    const installationResp = await bunqPost(
      '/installation',
      { client_public_key: publicKey },
      null // No auth token yet
    );

    let installationToken = null;
    let serverPublicKey = null;

    for (const item of installationResp.Response) {
      if (item.Token) {
        installationToken = item.Token.token;
      }
      if (item.ServerPublicKey) {
        serverPublicKey = item.ServerPublicKey.server_public_key;
      }
    }

    if (!installationToken) {
      throw new Error('Failed to obtain installation token from response.');
    }

    store.set('installationToken', installationToken);
    if (serverPublicKey) {
      store.set('serverPublicKey', serverPublicKey);
    }

    // Step 3: POST /device-server
    spinner.text = 'Registering device server...';
    await bunqPost(
      '/device-server',
      {
        description: 'bunq-cli',
        secret: config.apiKey,
        permitted_ips: ['*'],
      },
      installationToken
    );

    // Step 4: POST /session-server
    spinner.text = 'Creating session...';
    const sessionResp = await bunqPost(
      '/session-server',
      { secret: config.apiKey },
      installationToken
    );

    let sessionToken = null;
    let userId = null;

    for (const item of sessionResp.Response) {
      if (item.Token) {
        sessionToken = item.Token.token;
      }
      if (item.UserPerson) {
        userId = String(item.UserPerson.id);
      } else if (item.UserCompany) {
        userId = String(item.UserCompany.id);
      } else if (item.UserApiKey) {
        userId = String(item.UserApiKey.id);
      }
    }

    if (!sessionToken) {
      throw new Error('Failed to obtain session token from response.');
    }

    store.set('sessionToken', sessionToken);
    if (userId) {
      store.set('userId', userId);
    }

    spinner.succeed('Authentication successful!');
    info(`Environment: ${config.sandbox ? 'sandbox' : 'production'}`);
    if (userId) {
      info(`User ID: ${userId}`);
    }
    info('Session token saved. You can now use all bunq commands.');
  } catch (err) {
    spinner.fail('Authentication failed.');
    handleError(err);
  }
}

async function refreshSession() {
  const config = getConfig();

  if (!config.apiKey) {
    error('No API key configured. Run: bunq config set --api-key <key>');
    process.exit(1);
  }

  if (!config.installationToken) {
    info('No installation found. Running full setup...');
    return setupAuth();
  }

  const spinner = ora('Refreshing session...').start();

  try {
    const sessionResp = await bunqPost(
      '/session-server',
      { secret: config.apiKey },
      config.installationToken
    );

    let sessionToken = null;
    let userId = null;

    for (const item of sessionResp.Response) {
      if (item.Token) {
        sessionToken = item.Token.token;
      }
      if (item.UserPerson) {
        userId = String(item.UserPerson.id);
      } else if (item.UserCompany) {
        userId = String(item.UserCompany.id);
      } else if (item.UserApiKey) {
        userId = String(item.UserApiKey.id);
      }
    }

    if (!sessionToken) {
      throw new Error('Failed to obtain session token.');
    }

    store.set('sessionToken', sessionToken);
    if (userId) store.set('userId', userId);

    spinner.succeed('Session refreshed successfully.');
  } catch (err) {
    spinner.fail('Session refresh failed.');
    handleError(err);
  }
}

export function createAuthCommand() {
  const auth = new Command('auth');
  auth.description('Manage authentication with the Bunq API');

  const setupCmd = new Command('setup');
  setupCmd
    .description(
      'Complete full authentication setup (installation + device + session)'
    )
    .action(setupAuth);

  const refreshCmd = new Command('refresh');
  refreshCmd
    .description('Refresh the current session token')
    .action(refreshSession);

  const statusCmd = new Command('status');
  statusCmd.description('Show current authentication status').action(() => {
    const config = getConfig();
    printKeyValue(
      {
        'API Key set': config.apiKey ? 'yes' : 'no',
        'Installation token': config.installationToken ? 'yes' : 'no',
        'Session token': config.sessionToken ? 'yes' : 'no',
        'User ID': config.userId || '(not set)',
        'Environment': config.sandbox ? 'sandbox' : 'production',
        'Base URL': getBaseUrl(),
      },
      'Authentication Status'
    );
  });

  auth.addCommand(setupCmd);
  auth.addCommand(refreshCmd);
  auth.addCommand(statusCmd);

  return auth;
}
