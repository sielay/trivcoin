const ursa = require("ursa");
const crypto = require("crypto");
const edDSA = require("ed25519");
/**
 * 
 */
module.exports.createKeyPair = () => {
    const key = ursa.generatePrivateKey(1024, 65537);
    const privkeypem = key.toPrivatePem();
    const pubkeypem = key.toPublicPem();
    return {
        private: privkeypem.toString('ascii'),
        public: pubkeypem.toString('ascii')
    };
}

/**
 * 
 * @param {String} message 
 * @param {PublicKey} publicKey 
 */
module.exports.encrypt = (message, publicKey) => publicKey.encrypt(message, "utf8", "base64");

/**
 * 
 * @param {String} body 
 * @param {PrivateKey} privateKey 
 */
module.exports.decrypt = (body, privateKey) => new Buffer(privateKey.decrypt(body, "base64", "utf8")).toString('utf8');

/**
 * 
 * @param {String} body 
 * @param {String} signature 
 * @param {PublicKey} publicKey 
 */
module.exports.RSAverify = (body, signature, publicKey) => {
    try {
        return publicKey.hashAndVerify("sha256", new Buffer(body).toString("base64"), signature, "base64");
    } catch (error) {
        return false;
    }
};

/**
 * 
 * @param {String} message 
 * @param {PrivateKey} privateKey 
 */
module.exports.RSAsign = (message, privateKey) => privateKey.hashAndSign("sha256", message, "utf8", "base64");

/**
 * @param {String} message 
 * @param {String} privateKey 
 */
module.exports.sign = (message, privateKey) => edDSA.Sign(new Buffer(message, "utf8"), new Buffer(privateKey, "hex")).toString("hex")

/**
 * 
 * @param {String} body 
 * @param {String} signature 
 * @param {String} publicKey 
 */
module.exports.verify = (body, signature, publicKey) => {
    try {
        return edDSA.Verify(new Buffer(body, "utf8"), new Buffer(signature, "hex"), new Buffer(publicKey, "hex"));
    } catch (error) {
        return false;
    }
};

/**
 * 
 * @param {String} body 
 */
module.exports.privateKey = (body) => ursa.createPrivateKey(body);

/**
 * 
 * @param {String} body 
 */
module.exports.publicKey = (body) => ursa.createPublicKey(body);

module.exports.hash = (any) => {
    let anyString = typeof (any) == "object" ? JSON.stringify(any) : any.toString();
    let anyHash = crypto.createHash("sha256").update(anyString).digest("hex");
    return anyHash;
}

module.exports.randomId = (size) => {
    size = size || 64;
    return crypto.randomBytes(Math.floor(size / 2)).toString("hex");
}
