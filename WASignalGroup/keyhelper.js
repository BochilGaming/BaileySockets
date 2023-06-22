const curve = require('libsignal/src/curve');
const nodeCrypto = require('crypto');

exports.generateSenderKey = function () {
    return nodeCrypto.randomBytes(32);
}

exports.generateSenderKeyId = function () {
    return nodeCrypto.randomInt(2147483647);
}

exports.generateSenderSigningKey = function (key) {
    if (!key) {
        key = curve.generateKeyPair();
    }

    return {
        public: key.pubKey,
        private: key.privKey,
    };
}


exports.hkdkOutputToSymmetricMaterial = function (signed1, signed2) {
    const keys = new Uint8Array(32);
    keys.set(new Uint8Array(signed1.slice(16))),
    keys.set(new Uint8Array(signed2.slice(0, 16)), 16)
    return {
        key: Buffer.from(keys),
        iv: Buffer.from(signed1.slice(0, 16))
    }
}