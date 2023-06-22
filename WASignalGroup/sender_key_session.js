class SenderKeySession {
    constructor(
        keyId,
        chainCounter,
        chainKey,
        signatureKey 
    ) {
        this.keyId = keyId
        this.signatureKey = signatureKey
        this.chainKey = {
            counter: chainCounter,
            key: chainKey
        }
        this.messageKeys = []
    }

    inspect() {
        return this.toString();
    }

    static deserialize(data) {
        const obj = new this();
        obj.keyId = data.keyId
        obj.signatureKey = {
            public: Buffer.from(data.signatureKey.public, 'base64'),
            private: Buffer.from(data.signatureKey.private, 'base64')
        }
        obj.chainKey =  {
            counter: data.chainKey.counter,
            key: Buffer.from(data.chainKey.key, 'base64')
        }
        obj.messageKeys = data.messageKeys
        return obj
    }

    serialize() {
        return {
            keyId: this.keyId,
            signatureKey: {
                public: this.signatureKey.public.toString('base64'),
                private: this.signatureKey.private.toString('base64'),
            },
            chainKey: {
                counter: this.chainKey.counter,
                key: this.chainKey.key.toString('base64')
            },
            messageKeys
        }
    }
}

module.exports = SenderKeySession