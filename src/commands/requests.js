import { Command } from 'commander';
import ora from 'ora';
import { requireAuth } from '../config.js';
import { bunqGet, bunqPost } from '../client.js';
import { printTable, printKeyValue, success, handleError } from '../output.js';

function formatRequest(req) {
  const amount = req.amount_inquired
    ? `${req.amount_inquired.value} ${req.amount_inquired.currency}`
    : 'N/A';
  const amountPaid = req.amount_responded
    ? `${req.amount_responded.value} ${req.amount_responded.currency}`
    : '—';
  const counterparty =
    req.counterparty_alias?.display_name ||
    req.counterparty_alias?.name ||
    req.counterparty_alias?.value ||
    '(unknown)';

  return {
    id: req.id,
    amount,
    amountPaid,
    counterparty,
    description: req.description || '',
    status: req.status || '',
    created: req.created ? req.created.slice(0, 10) : '',
  };
}

async function listRequests(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  if (!opts.accountId) {
    console.error('Error: --account-id is required.');
    process.exit(1);
  }

  const spinner = ora('Fetching payment requests...').start();

  try {
    const response = await bunqGet(
      `/user/${userId}/monetary-account/${opts.accountId}/request-inquiry`
    );
    spinner.stop();

    const requests = response.Response.map(
      (item) => item.RequestInquiry || item
    );

    if (opts.json) {
      console.log(JSON.stringify(requests, null, 2));
      return;
    }

    printTable(requests.map(formatRequest), [
      { header: 'ID', accessor: (r) => r.id },
      { header: 'Amount', accessor: (r) => r.amount },
      { header: 'Amount Paid', accessor: (r) => r.amountPaid },
      { header: 'Counterparty', accessor: (r) => r.counterparty },
      { header: 'Description', accessor: (r) => r.description },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'Date', accessor: (r) => r.created },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch requests.');
    handleError(err);
  }
}

async function createRequest(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora('Creating payment request...').start();

  try {
    const counterpartyAlias = {};

    if (opts.counterpartyEmail) {
      counterpartyAlias.type = 'EMAIL';
      counterpartyAlias.value = opts.counterpartyEmail;
    } else if (opts.counterpartyPhone) {
      counterpartyAlias.type = 'PHONE_NUMBER';
      counterpartyAlias.value = opts.counterpartyPhone;
    } else if (opts.counterpartyIban) {
      counterpartyAlias.type = 'IBAN';
      counterpartyAlias.value = opts.counterpartyIban;
    } else {
      spinner.fail('Provide --counterparty-email, --counterparty-phone, or --counterparty-iban.');
      process.exit(1);
    }

    const body = {
      amount_inquired: {
        value: String(opts.amount),
        currency: opts.currency || 'EUR',
      },
      counterparty_alias: counterpartyAlias,
      description: opts.description,
      allow_bunqme: opts.allowBunqme || false,
    };

    const response = await bunqPost(
      `/user/${userId}/monetary-account/${opts.accountId}/request-inquiry`,
      body
    );
    spinner.stop();

    const requestId = response.Response?.[0]?.Id?.id;
    success(`Payment request created! ID: ${requestId}`);

    if (opts.json) {
      console.log(JSON.stringify(response.Response, null, 2));
    } else {
      printKeyValue(
        {
          'Request ID': requestId,
          'Amount': `${opts.amount} ${opts.currency || 'EUR'}`,
          'Counterparty': opts.counterpartyEmail || opts.counterpartyPhone || opts.counterpartyIban,
          'Description': opts.description,
          'Status': 'PENDING',
        },
        'Request Details'
      );
    }
  } catch (err) {
    spinner.fail('Failed to create payment request.');
    handleError(err);
  }
}

async function getRequest(accountId, requestId, opts) {
  const config = requireAuth();
  const userId = config.userId;

  const spinner = ora(`Fetching request ${requestId}...`).start();

  try {
    const response = await bunqGet(
      `/user/${userId}/monetary-account/${accountId}/request-inquiry/${requestId}`
    );
    spinner.stop();

    const item = response.Response[0];
    const req = item.RequestInquiry || item;

    if (opts.json) {
      console.log(JSON.stringify(req, null, 2));
      return;
    }

    const formatted = formatRequest(req);
    printKeyValue(
      {
        'ID': req.id,
        'Amount Requested': formatted.amount,
        'Amount Paid': formatted.amountPaid,
        'Counterparty': formatted.counterparty,
        'Description': req.description,
        'Status': req.status,
        'Allow bunq.me': req.allow_bunqme ? 'yes' : 'no',
        'bunq.me URL': req.bunqme_share_url || '',
        'Created': req.created,
        'Updated': req.updated,
      },
      `Request #${requestId}`
    );
  } catch (err) {
    spinner.fail('Failed to fetch request.');
    handleError(err);
  }
}

export function createRequestsCommand() {
  const requests = new Command('requests');
  requests.description('Manage Bunq payment requests (request-inquiry)');

  const listCmd = new Command('list');
  listCmd
    .description('List payment requests for an account')
    .requiredOption('--account-id <id>', 'Monetary account ID')
    .option('--json', 'Output as JSON')
    .action((opts) => listRequests(opts));

  const createCmd = new Command('create');
  createCmd
    .description('Create a payment request')
    .requiredOption('--account-id <id>', 'Monetary account ID')
    .requiredOption('--amount <amount>', 'Amount to request (e.g. 25.00)')
    .option('--currency <currency>', 'Currency code', 'EUR')
    .option('--counterparty-email <email>', 'Counterparty email address')
    .option('--counterparty-phone <phone>', 'Counterparty phone number')
    .option('--counterparty-iban <iban>', 'Counterparty IBAN')
    .requiredOption('--description <desc>', 'Request description')
    .option('--allow-bunqme', 'Allow payment via bunq.me link', false)
    .option('--json', 'Output as JSON')
    .action((opts) => createRequest(opts));

  const getCmd = new Command('get');
  getCmd
    .description('Get a specific payment request')
    .argument('<account-id>', 'Monetary account ID')
    .argument('<request-id>', 'Request ID')
    .option('--json', 'Output as JSON')
    .action((accountId, requestId, opts) => getRequest(accountId, requestId, opts));

  requests.addCommand(listCmd);
  requests.addCommand(createCmd);
  requests.addCommand(getCmd);

  return requests;
}
