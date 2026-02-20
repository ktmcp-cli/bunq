import { Command } from 'commander';
import ora from 'ora';
import { requireAuth } from '../config.js';
import { bunqGet } from '../client.js';
import { printTable, printKeyValue, handleError } from '../output.js';

function formatCard(card) {
  const pan =
    card.primary_account_numbers?.[0]?.account_number ||
    card.primary_account_number ||
    '****';

  const truncatedPan =
    pan.length >= 4 ? '**** **** **** ' + pan.slice(-4) : pan;

  return {
    id: card.id,
    type: card.type || '',
    secondLine: card.second_line || '',
    nameLine: card.name_on_card || card.second_line || '',
    status: card.status,
    pan: truncatedPan,
    expiryDate: card.expiry_date || '',
    orderStatus: card.order_status || '',
    pinStatus: card.pin_status || '',
  };
}

async function listCards(opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora('Fetching cards...').start();

  try {
    const response = await bunqGet(`/user/${userId}/card`);
    spinner.stop();

    const cards = response.Response.map((item) => {
      const type = Object.keys(item)[0];
      return { _type: type, ...item[type] };
    });

    if (opts.json) {
      console.log(JSON.stringify(cards, null, 2));
      return;
    }

    printTable(cards.map(formatCard), [
      { header: 'ID', accessor: (r) => r.id },
      { header: 'Type', accessor: (r) => r.type },
      { header: 'Card Number', accessor: (r) => r.pan },
      { header: 'Name', accessor: (r) => r.nameLine },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'Expires', accessor: (r) => r.expiryDate },
      { header: 'Order Status', accessor: (r) => r.orderStatus },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch cards.');
    handleError(err);
  }
}

async function getCard(cardId, opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora(`Fetching card ${cardId}...`).start();

  try {
    const response = await bunqGet(`/user/${userId}/card/${cardId}`);
    spinner.stop();

    const item = response.Response[0];
    const cardType = Object.keys(item)[0];
    const card = item[cardType];

    if (opts.json) {
      console.log(JSON.stringify(card, null, 2));
      return;
    }

    const formatted = formatCard(card);
    printKeyValue(
      {
        'ID': card.id,
        'Type': card.type,
        'Card Number': formatted.pan,
        'Name on Card': card.name_on_card || '',
        'Second Line': card.second_line || '',
        'Status': card.status,
        'Order Status': card.order_status || '',
        'Expiry Date': card.expiry_date || '',
        'Country': card.country || '',
        'PIN status': card.pin_status || '',
        'Created': card.created,
        'Updated': card.updated,
      },
      `Card #${cardId}`
    );

    // Show primary account numbers if available
    if (card.primary_account_numbers && card.primary_account_numbers.length > 0) {
      console.log('\n');
      printTable(card.primary_account_numbers, [
        { header: 'Status', accessor: (r) => r.status },
        { header: 'Account Number', accessor: (r) => '**** ' + r.account_number?.slice(-4) },
      ]);
    }
  } catch (err) {
    spinner.fail('Failed to fetch card.');
    handleError(err);
  }
}

async function listCardTransactions(cardId, opts) {
  const config = requireAuth();
  const userId = config.userId;

  if (!userId) {
    console.error('User ID not found. Please run: bunq auth setup');
    process.exit(1);
  }

  const spinner = ora(`Fetching transactions for card ${cardId}...`).start();

  try {
    const response = await bunqGet(
      `/user/${userId}/card/${cardId}/card-transaction?count=${opts.limit || 25}`
    );
    spinner.stop();

    const transactions = response.Response.map(
      (item) => item.CardTransaction || item
    );

    if (opts.json) {
      console.log(JSON.stringify(transactions, null, 2));
      return;
    }

    printTable(transactions, [
      { header: 'ID', accessor: (r) => r.id },
      {
        header: 'Amount',
        accessor: (r) =>
          r.amount ? `${r.amount.value} ${r.amount.currency}` : 'N/A',
      },
      { header: 'Description', accessor: (r) => r.description || '' },
      { header: 'Merchant', accessor: (r) => r.merchant_name || '' },
      { header: 'Status', accessor: (r) => r.status || '' },
      {
        header: 'Date',
        accessor: (r) => (r.created ? r.created.slice(0, 10) : ''),
      },
    ]);
  } catch (err) {
    spinner.fail('Failed to fetch card transactions.');
    handleError(err);
  }
}

export function createCardsCommand() {
  const cards = new Command('cards');
  cards.description('Manage Bunq payment cards');

  const listCmd = new Command('list');
  listCmd
    .description('List all cards')
    .option('--json', 'Output as JSON')
    .action((opts) => listCards(opts));

  const getCmd = new Command('get');
  getCmd
    .description('Get details of a specific card')
    .argument('<card-id>', 'Card ID')
    .option('--json', 'Output as JSON')
    .action((cardId, opts) => getCard(cardId, opts));

  const transactionsCmd = new Command('transactions');
  transactionsCmd
    .description('List transactions for a card')
    .argument('<card-id>', 'Card ID')
    .option('--limit <n>', 'Number of transactions', '25')
    .option('--json', 'Output as JSON')
    .action((cardId, opts) => listCardTransactions(cardId, opts));

  cards.addCommand(listCmd);
  cards.addCommand(getCmd);
  cards.addCommand(transactionsCmd);

  return cards;
}
