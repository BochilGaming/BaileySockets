const SenderChainKey = require("./sender_chain_key")
const SenderSignatureKey = require("./sender_signature_key")

class SenderKeySession {
    constructor(
        keyId,
        chainCounter,
        chainKey,
        signatureKeyPair,
        signatureKeyPublic,
        signatureKeyPrivate
    ) {
        this.keyId = keyId
        if (signatureKeyPair) {
            signatureKeyPublic = signatureKeyPair.public
            signatureKeyPrivate = signatureKeyPair.private
        }
        this.signatureKey = new SenderSignatureKey(signatureKeyPublic, signatureKeyPrivate)
        this.chainKey = new SenderChainKey(chainCounter, chainKey)
        this.messageKeys = []
    }

    inspect() {
        return this.toString();
    }

    getKeyId() {
        return this.keyId
    }

    getChainKey() {
        return this.chainKey
    }

    getSignKey() {
        return this.signatureKey
    }

    getMessageKey(index) {
        return this.messageKeys[index]
    }

    static deserialize(data) {
        const obj = new this();
        obj.keyId = data.keyId
        obj.signatureKey = SenderSignatureKey.deserialize(data.signatureKey)
        obj.chainKey = SenderChainKey.deserialize(data.chainKey)
        if (Array.isArray(data.messageKeys)) {
            obj.messageKeys = data.messageKeys.map((messageKey) => typeof messageKey === 'string' ? Buffer.from(messageKey, 'base64') : messageKey)
        }
        return obj
    }

    serialize() {
        return {
            keyId: this.keyId,
            signatureKey: this.signatureKey.serialize(),
            chainKey: this.chainKey.serialize(),
            messageKeys: this.messageKeys.map((messageKey) => messageKey ? messageKey.toString('base64') : messageKey)
        }
    }
}

module.exports = SenderKeySession