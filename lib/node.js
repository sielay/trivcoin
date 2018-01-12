const PING = "ping";
const CONNECT = "connect";

const TRANSACTION_NEW = "trans.new";
const TRANSACTION_STATE = "trans.stat";
const TRANSACTION_QUEUE = "trans.queue";

const BLOCKS_LENGTH = "blocks.length";
const BLOCKS_HEAD = "blocks.head";
const BLOCKS_GET = "blocks.get";
const BLOCKS_SYNC = "blocks.sync";
const BLOCKS_NEW = "blocks.new";

const ADDRESS_TRANSACTIONS = "address.trans";
const ADDRESS_BALANCE = "address.balance";

const NODES_LIST = "nodes.list";
const NODES_ADD = "nodes.add";

const Transaction = require("./transaction");
const Block = require("./block");

class Node {
    constructor(transport, address, blocksDB, transactionsDB) {
        this.tx = transactionsDB;
        this.bx = blocksDB;
        this.t = transport;
        this.address = address;
        this.peers = [];
    }

    addPeers(list) {
        list.forEach(peer => {
            if (this.peers.indexOf(peer) === -1) {
                this.greet(peer);
            }
        });
    }

    greet(peer) {
        if (this.t.send(peer, {
            from: this.address,
            type: CONNECT
        })) {
            this.peers.push(peer);
        }
    }

    /**
     * 
     * @param {*} data 
     * @returns {Promise<any>}
     * 
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
    receive(data) {
        if (!data) {
            return Promise.reject(this.error("unknown", -1, "No data"));
        }

        const requestId = data.requestId;
        const args = [...data.cmd];
        const cmd = args.shift();

        return this
            .route(cmd, args)
            .then(
            response => this.respond(requestId, response),
            error => {
                console.error(error);
                return this.error(requestId, error.code, error)            
            });

    }

    route(cmd, args) {

        console.log("COMMAND", cmd);
        console.log("ARGS", typeof args, args);

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
        }

        return Promise.reject(new Error("Unheld request"));

    }

    blocksLength() {
        return this
            .bx
            .size()
            .then(size => ({
                length: size + 1
            }));
    }

    blocksHead() {
        return this
            .bx
            .size()
            .then(size =>
                size === 0
                    ? Block.genesis
                    : this.bx.get(size));
    }

    blocksGet(query) {

        let start = Math.max(0, !isNaN(query.start) ? parseInt(query.start) - 1 : 0);

        return this
            .bx
            .slice(start, query.lenght || 1)
            .then(list => start === 0
                ? [Block.genesis, ...list]
                : list
            )
            .then(list => ({
                blocks: list
            }));
    }

    transactionQueue() {

        return this
            .tx
            .list()
            .then(list => ({
                queue: list
            }));
    }

    transactionNew(requestId, data) {
        const that = this;
        return new Promise((resolve, reject) => {
            const newTransaction = Transaction.load(data);
            if (newTransaction.verify()) {
                throw new Error("Transaction is invalid");
            }
            this
                .tx
                .has(newTransaction.id)
                .then(exists => {
                    if (exists) {
                        throw new Error("Transaction id already in the queue");
                    }

                    return this.tx
                        .put(newTransaction.id, newTransaction.toJSON())
                        .then(() => ({
                            success: true
                        }));
                })
                .then(resolve, reject);
        });
    }

    respond(requestId, data, error) {
        return {
            "timestamp": Math.round(Date.now() / 1000),
            "from": {
                "host": "node2.trivcoin.com",
                "accepts": ["https"], // https, wss, etc.
                "address": this.address
            },
            "requestId": requestId,
            "error": error || undefined,
            "data": data || undefined,
            "env": process.env
        };
    }

    error(requestId, code, message) {
        return this.respond(requestId, undefined, {
            code,
            message
        });
    }

    ping(value) {
        this.broadcast(PING, value);
    }

    broadcast(type, value) {
        this.peers.forEach((peer) => this.t.send(peer, {
            from: this.address,
            type,
            value
        }));
    }
}

module.exports = Node;
