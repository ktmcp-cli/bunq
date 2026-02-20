import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig, setConfig, isConfigured } from './config.js';
import { listResources, getResource, createResource, updateResource, deleteResource } from './api.js';

const program = new Command();

function printSuccess(message) {
  console.log(chalk.green('✓') + ' ' + message);
}

function printError(message) {
  console.error(chalk.red('✗') + ' ' + message);
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function withSpinner(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

function requireAuth() {
  if (!isConfigured()) {
    printError('API credentials not configured.');
    console.log('\nRun the following to configure:');
    console.log(chalk.cyan('  bunq config set --api-key <key>'));
    process.exit(1);
  }
}

program
  .name('bunq')
  .description(chalk.bold('bunq CLI') + ' - DESCRIPTION')
  .version('1.0.0');

const configCmd = program.command('config').description('Manage CLI configuration');

configCmd
  .command('set')
  .description('Set configuration values')
  .option('--api-key <key>', 'API Key')
  .action((options) => {
    if (options.apiKey) {
      setConfig('apiKey', options.apiKey);
      printSuccess('API Key set');
    } else {
      printError('No options provided. Use --api-key');
    }
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const apiKey = getConfig('apiKey');
    console.log(chalk.bold('\nbunq CLI Configuration\n'));
    console.log('API Key: ', apiKey ? chalk.green('*'.repeat(8)) : chalk.red('not set'));
    console.log('');
  });

const resourcesCmd = program.command('resources').description('Manage resources');

resourcesCmd
  .command('list <type>')
  .description('List resources of a specific type')
  .option('--json', 'Output as JSON')
  .action(async (type, options) => {
    requireAuth();
    try {
      const data = await withSpinner(`Fetching ${type}...`, () => listResources(type));
      printJson(data);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

resourcesCmd
  .command('get <type> <id>')
  .description('Get a specific resource')
  .option('--json', 'Output as JSON')
  .action(async (type, id, options) => {
    requireAuth();
    try {
      const data = await withSpinner(`Fetching ${type}/${id}...`, () => getResource(type, id));
      printJson(data);
    } catch (error) {
      printError(error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
