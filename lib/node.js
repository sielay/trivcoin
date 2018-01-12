const PING = "ping";
const CONNECT = "connect";
const TRANSACTION_NEW = "transactionNew";

const Transaction = require("./transaction");

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
            return this.error("unknown", -1, "No data");
        }

        const requestId = data.requestId;
        const args = [...data.cmd];
        const cmd = args.shift();
        const that = this;

        switch (cmd) {
            case TRANSACTION_NEW: {
                try {
                    const newTransaction = Transaction.load(args[0]);
                    if (newTransaction.verify()) {

                        return this
                            .tx
                            .has(newTransaction.id)
                            .then(exists => {

                                if (exists) {
                                    return this.error(requestId, 1, "Transaction id already in the queue");
                                }
                                return this.tx
                                    .put(newTransaction.id, newTransaction.toJSON())
                                    .then(() => {
                                        that.respond(requestId, {
                                            success: true
                                        });
                                    });
                            })


                    } else {
                        return Promise.resolve(this.error(requestId, 1, "Transaction is invalid"));
                    }
                } catch (exception) {
                    return Promise.resolve(this.error(requestId, exception.code, exception.message));
                }
                break;
            }
            case CONNECT: {
                if (this.peers.indexOf(data.from) === -1) {
                    this.peers.push(data.from);
                }
                break;
            }
            case PING: {
                if (this.lastPing !== data.value) {
                    this.lastPing = data.value;
                    this.ping(data.value);
                }
                break;
            }
        }
        return this.error(requestId, -1, "Unheld request");
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
            "data": data || undefined
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
