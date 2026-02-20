import { Command } from 'commander';
import ora from 'ora';
import { requireAuth } from '../config.js';
import { bunqGet, bunqPost } from '../client.js';
import { printTable, printKeyValue, success, handleError } from '../output.js';

function formatPayment(payment) {
  const amount = payment.amount
    ? `${payment.amount.value} ${payment.amount.currency}`
    : 'N/A';
  const counterpartyName =
    payment.counterparty_alias?.display_name ||
    payment.counterparty_alias?.name ||
    '(unknown)';

  return {
    id: payment.id,
    amount,
    counterparty: counterpartyName,
    description: payment.description || '',
    type: payment.type || '',
    status: payment.status || '',
    created: payment.created ? payment.created.slice(0, 10) : '',
  };
}

async function listPayments(opts) {
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

  const limit = opts.limit || 25;
  const spinner = ora('Fetching payments...').start();

  try {
    const response = await bunqGet(
      `/user/${userId}/monetary-account/${opts.accountId}/payment?count=${limit}`
    );
    spinner.stop();

    const payments = response.Response.map((item) => item.Payment || item);

    if (opts.json) {
      console.log(JSON.stringify(payments, null, 2));
      return;
    }

    printTable(payments.map(formatPayment), [
      { header: 'ID', accessor: (r) => r.id },
      { header: 'Amount', accessor: (r) => r.amount },
      { header: 'Counterparty', accessor: (r) => r.counterparty },
      { header: 'Description', accessor: (r) => r.description },
      { header: 'Type', accessor: (r) => r.type },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'Date', accessor: (r) => r.created },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch payments.');
    handleError(err);
  }
}

async function createPayment(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const required = ['accountId', 'amount', 'iban', 'name', 'description'];
  for (const field of required) {
    if (!opts[field]) {
      console.error(`Error: --${field.replace(/([A-Z])/g, '-$1').toLowerCase()} is required.`);
      process.exit(1);
    }
  }

  const spinner = ora('Creating payment...').start();

  try {
    const body = {
      amount: {
        value: String(opts.amount),
        currency: opts.currency || 'EUR',
      },
      counterparty_alias: {
        type: 'IBAN',
        value: opts.iban,
        name: opts.name,
      },
      description: opts.description,
    };

    const response = await bunqPost(
      `/user/${userId}/monetary-account/${opts.accountId}/payment`,
      body
    );
    spinner.stop();

    const paymentId = response.Response?.[0]?.Id?.id;
    success(`Payment created successfully! ID: ${paymentId}`);

    if (opts.json) {
      console.log(JSON.stringify(response.Response, null, 2));
    } else {
      printKeyValue(
        {
          'Payment ID': paymentId,
          'Amount': `${opts.amount} ${opts.currency || 'EUR'}`,
          'To IBAN': opts.iban,
          'Recipient': opts.name,
          'Description': opts.description,
          'Status': 'PENDING',
        },
        'Payment Details'
      );
    }
  } catch (err) {
    spinner.fail('Failed to create payment.');
    handleError(err);
  }
}

async function getPayment(accountId, paymentId, opts) {
  const config = requireAuth();
  const userId = config.userId;

  const spinner = ora(`Fetching payment ${paymentId}...`).start();

  try {
    const response = await bunqGet(
      `/user/${userId}/monetary-account/${accountId}/payment/${paymentId}`
    );
    spinner.stop();

    const item = response.Response[0];
    const payment = item.Payment || item;

    if (opts.json) {
      console.log(JSON.stringify(payment, null, 2));
      return;
    }

    const formatted = formatPayment(payment);
    printKeyValue(
      {
        'ID': payment.id,
        'Amount': formatted.amount,
        'Counterparty': formatted.counterparty,
        'Counterparty IBAN': payment.counterparty_alias?.value || '',
        'Description': payment.description,
        'Type': payment.type,
        'Sub-type': payment.sub_type || '',
        'Status': payment.status,
        'Created': payment.created,
        'Updated': payment.updated,
      },
      `Payment #${paymentId}`
    );
  } catch (err) {
    spinner.fail('Failed to fetch payment.');
    handleError(err);
  }
}

export function createPaymentsCommand() {
  const payments = new Command('payments');
  payments.description('Manage Bunq payments');

  const listCmd = new Command('list');
  listCmd
    .description('List payments for an account')
    .requiredOption('--account-id <id>', 'Monetary account ID')
    .option('--limit <n>', 'Number of payments to return', '25')
    .option('--json', 'Output as JSON')
    .action((opts) => listPayments(opts));

  const createCmd = new Command('create');
  createCmd
    .description('Create a new payment')
    .requiredOption('--account-id <id>', 'Source monetary account ID')
    .requiredOption('--amount <amount>', 'Payment amount (e.g. 10.00)')
    .option('--currency <currency>', 'Currency code', 'EUR')
    .requiredOption('--iban <iban>', 'Recipient IBAN')
    .requiredOption('--name <name>', 'Recipient name')
    .requiredOption('--description <desc>', 'Payment description')
    .option('--json', 'Output as JSON')
    .action((opts) => createPayment(opts));

  const getCmd = new Command('get');
  getCmd
    .description('Get a specific payment')
    .argument('<account-id>', 'Monetary account ID')
    .argument('<payment-id>', 'Payment ID')
    .option('--json', 'Output as JSON')
    .action((accountId, paymentId, opts) => getPayment(accountId, paymentId, opts));

  payments.addCommand(listCmd);
  payments.addCommand(createCmd);
  payments.addCommand(getCmd);

  return payments;
}
