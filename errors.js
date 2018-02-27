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

class ChainEditError extends ChainError {
    constructor(message) {
        super(message || "ChainEditError");
    }
}

class ChainCreateError extends ChainError {
    constructor(message) {
        super(message || "ChainCreateError");
    }
}

module.exports = {
    ChainValueError,
    ChainInvalidRelError,
    ChainEditError,
    ChainCreateError
}
