import { Command } from 'commander';
import ora from 'ora';
import { requireAuth } from '../config.js';
import { bunqGet } from '../client.js';
import { printKeyValue, printTable, handleError } from '../output.js';

async function getUserInfo(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora('Fetching user information...').start();

  try {
    const response = await bunqGet(`/user/${userId}`);
    spinner.stop();

    const item = response.Response[0];
    const userType = Object.keys(item)[0];
    const user = item[userType];

    if (opts.json) {
      console.log(JSON.stringify(user, null, 2));
      return;
    }

    // Different fields depending on user type
    const details = {
      'ID': user.id,
      'Type': userType,
      'Status': user.status,
      'Sub-status': user.sub_status || '',
    };

    if (userType === 'UserPerson') {
      details['First Name'] = user.first_name || '';
      details['Last Name'] = user.last_name || '';
      details['Display Name'] = user.display_name || '';
      details['Email'] = user.email || '';
      details['Country'] = user.country || '';
      details['Language'] = user.language || '';
      details['Region'] = user.region || '';
    } else if (userType === 'UserCompany') {
      details['Company Name'] = user.name || '';
      details['Display Name'] = user.display_name || '';
      details['Email'] = user.email || '';
      details['Country of Registration'] = user.country_of_registration || '';
    } else if (userType === 'UserApiKey') {
      details['Requested By User'] = user.requested_by_user?.UserPerson?.display_name || '';
    }

    details['Created'] = user.created;
    details['Updated'] = user.updated;

    printKeyValue(details, `User: ${user.display_name || user.id}`);

    // Show aliases if present
    if (user.alias && user.alias.length > 0) {
      console.log('\nAliases:');
      printTable(user.alias, [
        { header: 'Type', accessor: (r) => r.type },
        { header: 'Value', accessor: (r) => r.value },
        { header: 'Name', accessor: (r) => r.name || '' },
      ]);
    }
  } catch (err) {
    spinner.fail('Failed to fetch user info.');
    handleError(err);
  }
}

async function listUsers(opts) {
  const config = requireAuth();
  const spinner = ora('Fetching users...').start();

  try {
    const response = await bunqGet('/user');
    spinner.stop();

    const users = response.Response.map((item) => {
      const type = Object.keys(item)[0];
      return { type, ...item[type] };
    });

    if (opts.json) {
      console.log(JSON.stringify(users, null, 2));
      return;
    }

    printTable(users, [
      { header: 'ID', accessor: (r) => r.id },
      { header: 'Type', accessor: (r) => r.type },
      { header: 'Display Name', accessor: (r) => r.display_name || '' },
      { header: 'Status', accessor: (r) => r.status || '' },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch users.');
    handleError(err);
  }
}

export function createUserCommand() {
  const user = new Command('user');
  user.description('Manage Bunq user information');

  const infoCmd = new Command('info');
  infoCmd
    .description('Get information about the authenticated user')
    .option('--json', 'Output as JSON')
    .action((opts) => getUserInfo(opts));

  const listCmd = new Command('list');
  listCmd
    .description('List all users accessible with the API key')
    .option('--json', 'Output as JSON')
    .action((opts) => listUsers(opts));

  user.addCommand(infoCmd);
  user.addCommand(listCmd);

  // Default action: show user info
  user.action((opts) => getUserInfo(opts));

  return user;
}
