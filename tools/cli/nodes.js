const os = require("os");
const path = require("path");
const fs = require("fs");
const colors = require("colors");
const prompt = require("prompt");
const request = require("request");
const timestamp = require("../../lib/timestamp");

const TRIVCOIN_PATH = path.join(os.homedir(), ".trivcoin");
const NODES_PATH = path.join(TRIVCOIN_PATH, "nodes");

function save(json) {
    fs.mkdir(TRIVCOIN_PATH, (err) => {
        if (err && err.code !== "EEXIST") {
            console.error(colors.red(err.message));
            process.exit(-1);
        } else {
            fs.writeFile(NODES_PATH, JSON.stringify(json), "utf8", (err2) => {
                if (err2) {
                    console.error(colors.red(err2.message));
                    process.exit(-1);
                } else {
                    console.log(colors.green("Nodes updated"));
                }
            });
        }
    });
}

function load() {
    return new Promise((resolve, reject) => {
        fs.readFile(NODES_PATH, (err, data) => {
            if (err && err.code !== "EEXIST") {
                return resolve([]);
            } else if (err) {
                console.error(colors.red(err.message));
                process.exit(-1);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    console.error(colors.red(error.message));
                    reject(error);
                }
            }
            return null;
        });
    });
}

function getNode(index, url) {
    if (url) {
        return Promise.resolve(url);
    }
    return load()
        .then((list) => {
            if (!list[index || 0]) {
                console.error(colors.red("Invalid node"));
                process.exit(-1);
            }

            return list[index || 0];
        });
}

function post(node, cmd, args, debug) {
    const json = {
        timestamp: timestamp(),
        from: {
            host: "client",
            accepts: [], // https, wss, etc.
            address: null,
        },
        requestId: "TBD",
        cmd: [cmd, ...args],
    };

    if (debug) {
        console.log("-".repeat(10));
        console.log("REQUEST", node);
        console.log(JSON.stringify(json, null, 4));
        console.log("=".repeat(10));
    }

    return new Promise((resolve, reject) => {
        request.post(
            node,
            {
                json,
            },
            (error, response, body) => {
                if (debug) {
                    console.log("-".repeat(10));
                    console.log("RESPONSE", response.statusCode);
                    console.log(JSON.stringify(body, null, 4));
                    console.log("=".repeat(10));
                }

                if (!error && response.statusCode === 200) {
                    return resolve(body.data);
                }
                if (error) {
                    return reject(error);
                }
                return reject(body);
            },
        );
    });
}

module.exports = (command, options) => {
    switch (command) {
    case "ls": {
        load().then((nodes) => {
            console.log("Nodes (", nodes.length, ")\n");
            nodes.forEach((node, index) => {
                console.log(`${index} - ${node}`);
            });
            console.log("\n\n");
        });
        break;
    }
    case "add": {
        prompt.start();
        prompt.get({
            properties: {
                address: {
                    description: "Enter node full address",
                    required: true,
                },
            },
        }, (err, result) => {
            if (err) {
                console.error(colors.red(err.message));
                process.exit(-1);
            }
            load()
                .then((nodes) => {
                    save([...nodes, result.address]);
                });
        });
        break;
    }
    case "blocks.head": {
        getNode(options.node, options.url)
            .then((node) => {
                post(node, "blocks.head", [], options.debug)
                    .then(data => console.log(data), err => console.error(colors.red(err)));
            });
        break;
    }
    case "blocks.length": {
        getNode(options.node, options.url)
            .then((node) => {
                post(node, "blocks.length", [], options.debug)
                    .then(data => console.log(data), err => console.error(err, colors.red(err)));
            });
        break;
    }
    case "blocks.get": {
        getNode(options.node, options.url)
            .then((node) => {
                post(node, "blocks.get", [{
                    start: options.start,
                    length: options.length,
                }], options.debug)
                    .then(data => console.log(data), err => console.error(colors.red(err.message)));
            });
        break;
    }
    case "help":
    default: {
        console.log(`Usage: trivcoin [options] nodes [cmd]

Options:
    -n --node   index of node to use
    -u --url"   url of node to use                

Commands:
   nodes ls
   nodes add
   nodes remove
   nodes blocks.length
   nodes blocks.head
   nodes blocks.get --start 0 --end 10
   nodes blocks.sync 
   nodes blocks.nwe
`);
        break;
    }
    }
};
