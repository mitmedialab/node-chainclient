class ChainError extends Error {
    constructor(message) {
        super();
        this.message = message || "ChainClient error";
    }
}

class ChainValueError extends ChainError {
    constructor(message) {
        super(message);
    }
}

class ChainInvalidRelError extends ChainError {
    constructor(message) {
        super(message || "Invalid relation.");
    }
}

module.exports = {
    ChainValueError,
    ChainInvalidRelError
}
