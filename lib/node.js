const PING = "ping";
const CONNECT = "connect";

class Node {
    constructor(transport, address) {
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

    receive(data) {
        if (!data) {
            return; // ignore
        }
        switch (data.type) {
            case CONNECT: {
                if (this.peers.indexOf(data.from) === -1) {
                    this.peers.push(data.from);
                }
            }
            case PING: {
                if (this.lastPing !== data.value) {
                    this.lastPing = data.value;
                    this.ping(data.value);
                }
                break;
            }
        }
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
