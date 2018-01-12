const os = require("os");
const path = require("path");
const fs = require("fs");
const colors = require("colors");
const prompt = require("prompt");
const request = require("request");

const TRIVCOIN_PATH = path.join(os.homedir(), ".trivcoin");
const NODES_PATH = path.join(TRIVCOIN_PATH, "nodes");

function save(json) {
    fs.mkdir(TRIVCOIN_PATH, (err) => {
        if (err && err.code !== "EEXIST") {
            console.error(colors.red(err.message));
            process.exit(-1);
        } else {
            fs.writeFile(NODES_PATH, JSON.stringify(json), "utf8", (err) => {
                if (err) {
                    console.error(colors.red(err.message));
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
        });
    });
}

function getNode(index, url) {
    if (url) {
        return Promise.resolve(url);
    }
    return load()
        .then(list => {
            if (!index) {
                index = 0;
            }

            if (!list[index]) {
                console.error(colors.red("Invalid node"));
                process.exit(-1);
            }

            return list[index];
        });
}

function post(node, cmd, args) {
    return new Promise((resolve, reject) => {
        request.post(
            node,
            {
                json: {
                    "timestamp": Math.round(Date.now() / 1000),
                    "from": {
                        "host": "client",
                        "accepts": [], // https, wss, etc.
                        "address": null
                    },
                    "requestId": "TBD",
                    "cmd": [cmd, ...args]
                }
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    return resolve(body.data);
                }
                reject(error);
            }
        );
    })
}

module.exports = (command, options) => {

    switch (command) {
        case "ls": {
            load()
                .then(nodes => {
                    console.log("Nodes (", nodes.length, ")\n");
                    nodes.forEach((node, index) => {
                        console.log(index + " - " + node);
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
                        required: true
                    }
                }
            }, (err, result) => {
                if (err) {
                    console.error(colors.red(err.message));
                    process.exit(-1);
                }
                load()
                    .then(nodes => {
                        save([...nodes, result.address]);
                    });
            });
            break;
        }
        case "blocks.head": {
            getNode(options.node, options.url)
                .then(node => {
                    post(node, "blocks.head", [])
                        .then(data => console.log(data), err => console.error(colors.red(err)));
                });
            break;
        }
        case "blocks.length": {
            getNode(options.node, options.url)
                .then(node => {
                    post(node, "blocks.length", [])
                        .then(data => console.log(data), err => console.error(err, colors.red(err)));
                });
            break;
        }
        case "blocks.get": {
            getNode(options.node, options.url)
                .then(node => {
                    post(node, "blocks.get", [{
                        start: options.start,
                        end: options.end
                    }])
                        .then(data => console.log(data), err => console.error(err, colors.red(err)));
                });
            break;
        }
        case "help":
        default: {
            console.log(
                `Usage: trivcoin [options] nodes [cmd]

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
`
            );
            break;
        }

    }

}
