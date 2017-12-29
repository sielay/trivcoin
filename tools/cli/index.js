const program = require("commander");
const colors = require("colors");
const os = require("os");

const wallet = require("./wallet");

program
    .version('0.1.0');

program
    .command('wallet [cmd]')
    .alias('w')
    .description('Wallet operations')
    .action(function (cmd, options) {
        wallet(cmd, options);
    });

program
    .command('*')
    .action(() => program.help());

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.help();
}
