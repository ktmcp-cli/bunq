import chalk from 'chalk';

export function printTable(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerLen = col.header.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = String(col.accessor(row) || '');
      return Math.max(max, val.length);
    }, 0);
    return Math.max(headerLen, maxDataLen);
  });

  // Print header
  const header = columns
    .map((col, i) => col.header.padEnd(widths[i]))
    .join('  ');
  console.log(chalk.bold.cyan(header));
  console.log(chalk.cyan('─'.repeat(header.length)));

  // Print rows
  rows.forEach((row) => {
    const line = columns
      .map((col, i) => String(col.accessor(row) || '').padEnd(widths[i]))
      .join('  ');
    console.log(line);
  });
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function printKeyValue(obj, title) {
  if (title) {
    console.log(chalk.bold.cyan(`\n${title}`));
    console.log(chalk.cyan('─'.repeat(title.length)));
  }
  Object.entries(obj).forEach(([key, value]) => {
    const formattedKey = key.padEnd(24);
    console.log(`${chalk.bold(formattedKey)} ${value ?? chalk.dim('null')}`);
  });
}

export function success(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

export function error(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

export function info(message) {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

export function handleError(err) {
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;
    error(`HTTP ${status}: ${JSON.stringify(data)}`);
  } else if (err.message) {
    error(err.message);
  } else {
    error('An unknown error occurred.');
  }
  process.exit(1);
}
