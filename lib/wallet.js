const edDSA = require("ed25519");
const util = require("./util");

const SALT = "fb04b2fad7e8a159b4c8f3abbca6c87797285f34d5d9ec93e2b311504fcd0b19202281433e7e3913f7";

class Wallet {
    constructor() {
        this.id = null;
        this.passwordHash = null;
        this.secret = null;
        this.keyPairs = [];
    }

    generateAddress() {
        if (this.secret == null) {
            this.generateSecret();
        }

        const lastKeyPair = this.keyPairs[this.keyPairs.length - 1];

        // Generate next seed based on the first secret or a new secret from the last key pair.
        const seed = (lastKeyPair == null ? this.secret : util.hash((lastKeyPair.secret || null) + SALT));
        const keyPairRaw = edDSA.MakeKeypair(Buffer.from(seed, "hex"));

        const newKeyPair = {
            index: this.keyPairs.length + 1,
            secretKey: keyPairRaw.privateKey.toString("hex"),
            publicKey: keyPairRaw.publicKey.toString("hex"),
        };
        this.keyPairs.push(newKeyPair);
        return newKeyPair.publicKey;
    }

    generateSecret() {
        this.secret = util.hash(this.passwordHash + SALT);
        return this.secret;
    }

    getByIndex(index) {
        return this.keyPairs.filter(k => k.index === index)[0];
    }

    getAddressByIndex(index) {
        const pair = this.getByIndex(index);
        if (!pair) {
            return null;
        }
        return pair.publicKey;
    }

    getAddressByPublicKey(publicKey) {
        if (this.keyPairs.filter(k => k.publicKey === publicKey)) {
            return publicKey;
        }
        return null;
    }

    getSecretKeyByAddress(address) {
        const pair = this.keyPairs.filter(k => k.publicKey === address)[0];
        if (!pair) {
            return null;
        }
        return pair.secretKey;
    }

    getAddresses() {
        return this.keyPairs.map(k => k.publicKey);
    }

    toJSON() {
        return {
            id: this.id,
            passwordHash: this.passwordHash,
            secret: this.secret,
            keyPairs: JSON.parse(JSON.stringify(this.keyPairs)),
        };
    }

    static fromPassword(password) {
        const wallet = new Wallet();
        wallet.id = util.randomId();
        wallet.passwordHash = util.hash(password);
        return wallet;
    }

    static fromHash(passwordHash) {
        const wallet = new Wallet();
        wallet.id = util.randomId();
        wallet.passwordHash = passwordHash;
        return wallet;
    }

    static fromJson(data) {
        const wallet = new Wallet();
        wallet.id = data.id;
        wallet.passwordHash = data.passwordHash;
        wallet.secret = data.secret;
        wallet.keyPairs = data.keyPairs;
        return wallet;
    }
}

module.exports = Wallet;
