const program = require("commander");

const wallet = require("./wallet");
const nodes = require("./nodes");

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
    .command("nodes [cmd]")
    .alias('n')
    .option("-n --node [index]", "index of node to use")
    .option("-u --url [url]", "url of node to use")
    .option("-s --start [start]")
    .option("-e --end [end]")
    .option("-b --b [body]")
    .option("-d --debug")
    .description('Nodes setup')
    .action(function (cmd, options) {
        nodes(cmd, options);
    });

program
    .command('*')
    .action(() => program.help());

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.help();
}
