const os = require("os");
const path = require("path");
const fs = require("fs");
const colors = require("colors");
const prompt = require("prompt");
const Wallet = require("../../lib/wallet");
const util = require("../../lib/util");
const crypto = require('crypto');

const ALGORITHM = "AES-256-CBC"; // CBC because CTR isn't possible with the current version of the Node.JS crypto library
const HMAC_ALGORITHM = 'SHA256';
const HMAC_KEY = new Buffer("3c869275dd53f5f6f0a3843132e777f393735a68842033419dfd4c1e7c86fede", "hex");

const TRIVCOIN_PATH = path.join(os.homedir(), ".trivcoin");
const WALLET_PATH = path.join(TRIVCOIN_PATH, "wallet");

function encrypt(json) {

    const IV = new Buffer(crypto.randomBytes(16)); // ensure that the IV (initialization vector) is random

    const encryptor = crypto.createCipheriv(ALGORITHM, new Buffer(json.passwordHash, "hex"), IV);
    encryptor.setEncoding('hex');
    encryptor.write(JSON.stringify(json));
    encryptor.end();

    const cipher_text = encryptor.read();

    const hmac = crypto.createHmac(HMAC_ALGORITHM, HMAC_KEY);
    hmac.update(cipher_text);
    hmac.update(IV.toString('hex')); // ensure that both the IV and the cipher-text is protected by the HMAC

    // The IV isn't a secret so it can be stored along side everything else
    return cipher_text + "$" + IV.toString('hex') + "$" + hmac.digest('hex');
}

function constant_time_compare(val1, val2) {
    var sentinel;

    if (val1.length !== val2.length) {
        return false;
    }


    for (var i = 0; i <= (val1.length - 1); i++) {
        sentinel |= val1.charCodeAt(i) ^ val2.charCodeAt(i);
    }

    return sentinel === 0
};

function decrypt(data, passwordHash) {
    const cipher_blob = data.split("$");
    const ct = cipher_blob[0];
    const IV = new Buffer(cipher_blob[1], "hex");
    const hmac = cipher_blob[2];

    const chmac = crypto.createHmac(HMAC_ALGORITHM, HMAC_KEY);
    chmac.update(ct);
    chmac.update(IV.toString('hex'));

    if (!constant_time_compare(chmac.digest('hex'), hmac)) {
        console.error(colors.red("Encrypted Blob has been tampered with..."));
        return null;
    }

    const decryptor = crypto.createDecipheriv(ALGORITHM, new Buffer(passwordHash, "hex"), IV);
    const decryptedText = decryptor.update(ct, "hex", "utf-8");
    return decryptedText + decryptor.final("utf-8");
}

function save(json) {

    fs.mkdir(TRIVCOIN_PATH, (err) => {
        if (err && err.code !== "EEXIST") {
            console.error(colors.red(err.message));
            process.exit(-1);
        } else {
            const hashed = encrypt(json);
            fs.writeFile(WALLET_PATH, hashed, "utf8", (err) => {
                if (err) {
                    console.error(colors.red(err.message));
                    process.exit(-1);
                } else {
                    console.log(colors.green("Wallet updated"));
                }
            });
        }
    });
}

function load(passwordHash, callback) {
    fs.readFile(WALLET_PATH, (err, data) => {
        if (err) {
            console.error(colors.red(err.message));
            process.exit(-1);
        } else {
            callback(Wallet.fromJson(JSON.parse(decrypt(data.toString("utf8"), passwordHash))));
        }
    });
}

function createWallet() {
    prompt.start();
    prompt.get({
        properties: {
            password: {
                description: "Enter your password",
                hidden: true,
                required: true
            },
            password2: {
                description: "Repeat your password",
                hidden: true,
                required: true
            }
        }
    }, (err, result) => {
        if (err) {
            console.error(colors.red(err.message));
            process.exit(-1);
        }
        if (result.password !== result.password2) {
            console.error(colors.red("Passwords doesn't match"));
            process.exit(-1);
        }
        const wallet = Wallet.fromPassword(result.password);
        save(wallet.toJSON());
    });
}

function passwordAndLoad(password, callback) {
    if (password) {
        return load(password, callback);
    }
    prompt.start();
    prompt.get({
        properties: {
            password: {
                description: "Enter your password",
                hidden: true,
                required: true
            }
        }
    }, (err, result) => {
        if (err) {
            console.error(colors.red(err.message));
            process.exit(-1);
        }
        return load(util.hash(result.password), callback);
    });
}

module.exports = (command, options) => {

    fs.readFile(WALLET_PATH, "utf8", (err, data) => {

        if (err && err.code !== "ENOENT") {
            console.error(colors.red(err.message), err.code);
            process.exit(-1);
        }

        const needWallet = () => {
            if (err) {
                console.log(colors.yellow("No wallet found. Type trivcoin wallet init"));
                process.exit(0);
            }
        }

        switch (command) {
            case "init": {
                createWallet();
                break;
            }
            case "ls": {
                needWallet();
                passwordAndLoad(options.password, (wallet) => {
                    if (wallet.keyPairs.length === 0) {
                        console.log("Your wallet is empty");
                        return;
                    }
                    console.log("Addresses (", wallet.keyPairs.length, ")\n");
                    wallet.getAddresses().forEach((pub) => {
                        console.log(" - ", pub);
                    });
                    console.log("\n\n");
                });
                break;
            }
            case "add": {
                needWallet();
                passwordAndLoad(options.password, (wallet) => {
                    wallet.generateAddress();
                    save(wallet.toJSON());
                });
                break;
            }
            case "help":
            default: {
                console.log(
                    `Usage: trivcoin [options] wallet [cmd]

Commands:
   wallet init
   wallet ls
   wallet add
   wallet remote [index]
`
                );
                break;
            }

        }


    });
}
