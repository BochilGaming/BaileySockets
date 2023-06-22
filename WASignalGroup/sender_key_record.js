const SenderKeySession = require("./sender_key_session");

const SESSION_RECORD_VERSION = 'v1';

class SenderKeyRecord {
    constructor(serialized) {
        /** @type {SenderKeySession[]} */
        this.sessions = [];
        this.version = SESSION_RECORD_VERSION;

        if (serialized) {
            if (serialized.version !== SESSION_RECORD_VERSION) {
                throw new Error("Error migrating GroupSessionRecord")
            }
            const list = serialized._sessions;
            for (let i = 0; i < list.length; i++) {
                const structure = list[i];
                this.sessions.push(SenderKeySession.deserialize(structure));
            }
        }
    }

    isEmpty() {
        return this.sessions.length === 0 
    }

    addSenderKeyState(keyId, chainCounter, chainKey, signatureKey) {
        this.sessions.push(new SenderKeySession(keyId, chainCounter, chainKey, signatureKey));
        if (this.sessions.length > 5) {
            this.sessions = this.sessions.slice(1)
        }
    }

    getSession(keyId) {
        for (let i = 0; i < this.sessions.length;  i++) {
            const state = this.sessions[i]
            if (state.keyId == keyId) {
                return state
            }
        }
    }

    /** @returns {SenderKeySession|undefined} */
    getOpenSession() {
        return this.sessions[this.sessions.length - 1]
    }

    deleteAllSessions() {
        this.sessions = []
    }


    serialize() {
        const _sessions = [];
        for (const entry of this.sessions) {
            _sessions.push(entry.serialize());
        }
        return {
            _sessions,
            version: this.version
        };
    }
}

module.exports = SenderKeyRecord