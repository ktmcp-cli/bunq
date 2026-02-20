import { Command } from 'commander';
import ora from 'ora';
import { requireAuth } from '../config.js';
import { bunqGet } from '../client.js';
import { printTable, printKeyValue, handleError } from '../output.js';

function formatBalance(account) {
  if (account.balance) {
    return `${account.balance.value} ${account.balance.currency}`;
  }
  return 'N/A';
}

function formatAccount(account) {
  return {
    id: account.id,
    description: account.description || account.display_name || '(no description)',
    balance: formatBalance(account),
    currency: account.currency || (account.balance ? account.balance.currency : 'EUR'),
    status: account.status,
    type: account.sub_type || account.account_type || 'CHECKING',
    iban: account.alias
      ? account.alias.find((a) => a.type === 'IBAN')?.value || ''
      : '',
  };
}

async function listAccounts(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora('Fetching accounts...').start();

  try {
    const response = await bunqGet(`/user/${userId}/monetary-account`);
    spinner.stop();

    const accounts = response.Response.map((item) => {
      const type = Object.keys(item)[0];
      return { _type: type, ...item[type] };
    });

    if (opts.json) {
      console.log(JSON.stringify(accounts, null, 2));
      return;
    }

    printTable(accounts.map(formatAccount), [
      { header: 'ID', accessor: (r) => r.id },
      { header: 'Description', accessor: (r) => r.description },
      { header: 'Balance', accessor: (r) => r.balance },
      { header: 'Currency', accessor: (r) => r.currency },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'IBAN', accessor: (r) => r.iban },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch accounts.');
    handleError(err);
  }
}

async function getAccount(accountId, opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora(`Fetching account ${accountId}...`).start();

  try {
    const response = await bunqGet(
      `/user/${userId}/monetary-account/${accountId}`
    );
    spinner.stop();

    const item = response.Response[0];
    const type = Object.keys(item)[0];
    const account = item[type];

    if (opts.json) {
      console.log(JSON.stringify(account, null, 2));
      return;
    }

    const formatted = formatAccount(account);
    printKeyValue(
      {
        'ID': formatted.id,
        'Description': formatted.description,
        'Balance': formatted.balance,
        'Currency': formatted.currency,
        'Status': formatted.status,
        'Type': formatted.type,
        'IBAN': formatted.iban || '(not available)',
        'Created': account.created,
        'Updated': account.updated,
      },
      `Account #${accountId}`
    );

    // Show aliases if present
    if (account.alias && account.alias.length > 0) {
      console.log('\n');
      printTable(account.alias, [
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Value', accessor: (r) => r.value },
        { header: 'Name', accessor: (r) => r.name || '' },
      ]);
    }
  } catch (err) {
    spinner.fail('Failed to fetch account.');
    handleError(err);
  }
}

export function createAccountsCommand() {
  const accounts = new Command('accounts');
  accounts.description('Manage Bunq monetary accounts');

  const listCmd = new Command('list');
  listCmd
    .description('List all monetary accounts')
    .option('--json', 'Output as JSON')
    .action((opts) => listAccounts(opts));

  const getCmd = new Command('get');
  getCmd
    .description('Get details of a specific account')
    .argument('<account-id>', 'The account ID')
    .option('--json', 'Output as JSON')
    .action((accountId, opts) => getAccount(accountId, opts));

  accounts.addCommand(listCmd);
  accounts.addCommand(getCmd);

  return accounts;
}
