const PING = "ping";
const CONNECT = "connect";

const TRANSACTION_NEW = "trans.new";
// const TRANSACTION_STATE = "trans.stat";
const TRANSACTION_QUEUE = "trans.queue";

const BLOCKS_LENGTH = "blocks.length";
const BLOCKS_HEAD = "blocks.head";
const BLOCKS_GET = "blocks.get";
// const BLOCKS_SYNC = "blocks.sync";
const BLOCKS_NEW = "blocks.new";

// const ADDRESS_TRANSACTIONS = "address.trans";
// const ADDRESS_BALANCE = "address.balance";

// const NODES_LIST = "nodes.list";
// const NODES_ADD = "nodes.add";

const Transaction = require("./transaction");
const Block = require("./block");
const timestamp = require("./timestamp");
const uuidv4 = require("uuid/v4");

class Node {
    static success() {
        return Promise.resolve({
            success: true,
        });
    }

    constructor(transport, host, address, blocksDB, transactionsDB) {
        this.tx = transactionsDB;
        this.bx = blocksDB;
        this.t = transport;
        this.host = host;
        this.address = address;
        this.peers = [];
    }

    addPeers(list) {
        list.forEach((peer) => {
            if (this.peers.indexOf(peer) === -1) {
                this.peers.push(peer);
                this.greet(peer);
            }
        });
    }

    send(peer, command, args) {
        return this.t.send(peer, {
            timestamp: timestamp(),
            from: {
                host: this.host,
                accepts: ["https"],
                address: this.address,
            },
            requestId: uuidv4(),
            cmd: [command, ...(Array.isArray(args) ? args : [])],
        });
    }

    /**
     * @param {*} data
     * @returns {Promise<any>}
     * @example
     * <code language="javascript>
     * {
     *     "timestamp": 12345,
     *     "from": {
     *         "host": "node1.trivcoin.com",
     *         "accepts": ["https"], // https, wss, etc.
     *         "address": "abcdef0123456789"
     *     },
     *     "requestId": "someRandomHash",
     *     "cmd": ["blocks.oneByIndex", 12]
     * }
     * </code>
     */
    receive({ requestId, cmd }) {
        if (!cmd) {
            return Promise.resolve(this.error("unknown", -1, "No data"));
        }

        const command = cmd.shift();

        return this
            .route(command, cmd)
            .then(
                response => this.respond(requestId, response),
                (error) => {
                    console.error(error);
                    return this.error(requestId, error.code, error);
                },
            );
    }

    respond(requestId, data, error) {
        return {
            timestamp: timestamp(),
            from: {
                host: this.host,
                accepts: ["https"], // https, wss, etc.
                address: this.address,
            },
            requestId,
            error: error || undefined,
            data: data || undefined,
            env: process.env,
        };
    }

    route(cmd, args) {
        switch (cmd) {
        case TRANSACTION_NEW: {
            return this.transactionNew(args[0]);
        }
        case TRANSACTION_QUEUE: {
            return this.transactionQueue();
        }
        case BLOCKS_LENGTH: {
            return this.blocksLength();
        }
        case BLOCKS_HEAD: {
            return this.blocksHead();
        }
        case BLOCKS_GET: {
            return this.blocksGet(args[0]);
        }
        case BLOCKS_NEW: {
            return this.blocksNews();
        }
        case CONNECT: {
            return this.connectionRequest(args[0]);
        }
        case PING: {
            if (this.lastPing !== args[0]) {
                [this.lastPing] = args;
                return this.ping(args[0]);
            }
            return Promise.resolve(args);
        }
        default: {
            return Promise.reject(new Error("Unheld request"));
        }
        }
    }

    blocksLength() {
        return this
            .bx
            .size()
            .then(size => ({
                length: size + 1,
            }));
    }

    blocksHead() {
        return this
            .bx
            .size()
            .then(size => (size === 0 ? Block.genesis : this.bx.get(size)));
    }

    blocksGet(query) {
        const start = Math.max(0, parseInt(query.start, 0) - 1);

        return this
            .bx
            .slice(start, query.lenght || 1)
            .then(list => (start === 0 ? [Block.genesis, ...list] : list))
            .then(list => ({
                blocks: list,
            }));
    }

    transactionQueue() {
        return this
            .tx
            .list()
            .then(list => ({
                queue: list,
            }));
    }

    transactionNew(requestId, data) {
        const that = this;
        return new Promise((resolve, reject) => {
            const newTransaction = Transaction.load(data);
            if (newTransaction.verify()) {
                throw new Error("Transaction is invalid");
            }
            that
                .tx
                .has(newTransaction.id)
                .then((exists) => {
                    if (exists) {
                        throw new Error("Transaction id already in the queue");
                    }

                    return that.tx
                        .put(newTransaction.id, newTransaction.toJSON())
                        .then(() => Node.success());
                })
                .then(resolve, reject);
        });
    }

    connectionRequest(host) {
        if (this.peers.indexOf(host) === -1) {
            this.peers.push(host);
            return Node.success();
        }
        return Promise.resolve({
            success: true,
            message: "I already know that node",
        });
    }

    greet(peer) {
        return this
            .send(peer, CONNECT, [this.host]);
    }

    error(requestId, code, message) {
        return this.respond(requestId, undefined, {
            code,
            message,
        });
    }

    ping(value) {
        return this.broadcast(PING, [value]);
    }

    broadcast(command, args) {
        return Promise
            .all(this.peers
                .map(peer => this.send(peer, command, args)));
    }
}

module.exports = Node;
