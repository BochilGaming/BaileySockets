const queueJob = require("./queue_job")
const SenderKeyRecord = require("./sender_key_record")
const SenderKeySession = require("./sender_key_session")
const crypto = require('libsignal/src/crypto')
const curve = require('libsignal/src/curve');
const { MessageCounterError } = require('libsignal/src/errors')
const protobufs = require('./protobufs')
const keyhelper = require("./keyhelper");
const CiphertextMessage = require("./ciphertext_message")

class GroupCipher extends CiphertextMessage {
    constructor(senderKeyStore, senderKeyName) {
        this.senderKeyStore = senderKeyStore;
        this.senderKeyName = senderKeyName;
    }

    async queueJob(awaitable) {
        return await queueJob(this.senderKeyName.toString(), awaitable);
    }

    async encrypt(paddedPlaintext) {
        return await this.queueJob(async () => {
            /** @type {SenderKeyRecord} */
            const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName);
            if (!record) {
                throw new Error("No session senderKeyRecord")
            }
            const senderKeySession = record.getOpenSession();
            if (!senderKeySession) {
                throw new Error("No session to encrypt message");
            }
            const chainKeyCounter = senderKeySession.chainKey.counter
            const counter = chainKeyCounter === 0 ? 0 : chainKeyCounter + 1
            this.fillMessageKeys(senderKeySession, counter)
            const messageKey = senderKeySession.messageKeys[counter]
            const msg = protobufs.SenderKeyMessage.create()
            msg.id = senderKeySession.keyId
            msg.iteration = counter
            delete senderKeySession.messageKeys[counter]
            const keys = crypto.deriveSecrets(messageKey, Buffer.alloc(32), Buffer.from("WhisperGroup"))
            const symmetricMaterial = keyhelper.hkdkOutputToSymmetricMaterial(keys[0], keys[1])
            const ciphertext = crypto.encrypt(symmetricMaterial.key, paddedPlaintext, symmetricMaterial.iv)
            msg.ciphertext = ciphertext
            const msgBuf = protobufs.SenderKeyMessage.encode(msg).finish()
            const msgVer = Buffer.alloc(msgBuf.byteLength + 1);
            const version = (((this.CURRENT_VERSION << 4) | this.CURRENT_VERSION) & 0xff) % 256;
            msgVer[0] = version // 51
            msgVer.set(msgBuf, 1)
            const signature = curve.calculateSignature(
                Buffer.from(senderKeySession.signatureKey.private), msgVer)
            const msgSign = Buffer.alloc(msgBuf.byteLength + (32 * 2) + 1)
            msgSign[0] = version
            msgSign.set(msgBuf, 1)
            msgSign.set(Buffer.from(signature, 0, 64), msgBuf.byteLength + 1)
            await this.senderKeyStore.storeSenderKey(this.senderKeyName, record)
            return msgSign
        })
    }

    async decrypt(senderKeyMessageBytes) {
        const version = senderKeyMessageBytes[0]
        if ((15 & version) > this.CURRENT_VERSION || version >> 4 < this.CURRENT_VERSION) {
            throw new Error("Incompatible version number on SenderKeyMessage")
        }
        const msgBuf = senderKeyMessageBytes.slice(1, senderKeyMessageBytes.byteLength - 64)
        const part = senderKeyMessageBytes.slice(0, senderKeyMessageBytes.byteLength - 64)
        const sign = senderKeyMessageBytes.slice(senderKeyMessageBytes.byteLength - 64)
        const msg = protobufs.SenderKeyMessage.decode(msgBuf)
        const keyId = msg.id
        return await this.queueJob(async () => {
            /** @type {SenderKeyRecord} */
            const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName)
            if (!record) {
                throw new Error("No session found to decrypt message")
            }
            const senderKeySession = record.getSession(keyId)
            const pubKey = Buffer.from(senderKeySession.signatureKey.public)
            curve.verifySignature(pubKey, part, sign)
            this.fillMessageKeys(senderKeySession, msg.iteration)
            const messageKey = senderKeySession.messageKeys[msg.iteration]
            if (!messageKey) {
                throw new MessageCounterError("Message key not found. The counter was repeated or the key was not filled.")
            }
            delete senderKeySession.messageKeys[msg.iteration]
            const keys = crypto.deriveSecrets(messageKey, Buffer.alloc(32), Buffer.from("WhisperGroup"))
            const symmetricMaterial = keyhelper.hkdkOutputToSymmetricMaterial(keys[0], keys[1])
            const plaintext = crypto.decrypt(symmetricMaterial.key, msg.ciphertext, symmetricMaterial.iv)
            await this.senderKeyStore.storeSenderKey(this.senderKeyName, record)
            return plaintext
        })
    }

    /**
     * 
     * @param {SenderKeySession} senderKeySession 
     * @param {number} counter 
     */
    fillMessageKeys(senderKeySession, counter) {
        const chainCounter = senderKeySession.chainKey.counter
        if (chainCounter > counter) {
            return
        }
        if (counter - chainCounter > 2000) {
            throw new Error("Over 2000 messages into the future!")
        }
        const key = senderKeySession.chainKey.key;
        if (!key) {
            throw new Error("Got invalid request to extend chain after it was already closed")
        }
        senderKeySession.messageKeys[chainCounter] = crypto.calculateMAC(key, Buffer.from([1]))
        senderKeySession.chainKey.key = crypto.calculateMAC(key, Buffer.from([2]))
        senderKeySession.chainKey.counter += 1
        return this.fillMessageKeys(senderKeySession, counter)
    }
}

module.exports = GroupCipher