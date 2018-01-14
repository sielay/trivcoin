const crypto = require("crypto");
const edDSA = require("ed25519");

/**
 * @param {String} message
 * @param {PublicKey} publicKey
 */
module.exports.encrypt = (message, publicKey) => publicKey.encrypt(message, "utf8", "base64");

/**
 * @param {String} body
 * @param {PrivateKey} privateKey
 */
module.exports.decrypt = (body, privateKey) => Buffer.from(privateKey.decrypt(body, "base64", "utf8")).toString("utf8");

/**
 * @param {String} body
 * @param {String} signature

 */
module.exports.RSAverify = (body, signature, publicKey) => {
    try {
        return publicKey.hashAndVerify("sha256", Buffer.from(body).toString("base64"), signature, "base64");
    } catch (error) {
        return false;
    }
};

/**
 * @param {String} message
 * @param {PrivateKey} privateKey
 */
module.exports.RSAsign = (message, privateKey) => privateKey.hashAndSign("sha256", message, "utf8", "base64");

/**
 * @param {String} message
 * @param {String} privateKey
 */
module.exports.sign = (message, privateKey) => edDSA.Sign(Buffer.from(message, "utf8"), Buffer.from(privateKey, "hex")).toString("hex");

/**
 * @param {String} body
 * @param {String} signature
 * @param {String} publicKey
 */
module.exports.verify = (body, signature, publicKey) => {
    try {
        return edDSA.Verify(Buffer.from(body, "utf8"), Buffer.from(signature, "hex"), Buffer.from(publicKey, "hex"));
    } catch (error) {
        return false;
    }
};

module.exports.hash = (any) => {
    const anyString = typeof (any) === "object" ? JSON.stringify(any) : any.toString();
    return crypto.createHash("sha256").update(anyString).digest("hex");
};

module.exports.randomId = size => crypto.randomBytes(Math.floor((size || 64) / 2)).toString("hex");
