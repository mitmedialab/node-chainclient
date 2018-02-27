const ChainClient = require('./lib/client');
const {ChainError, ChainValueError, ChainEditError,
    ChainCreateError} = require('./lib/errors');

module.exports = {
    ChainClient,
    ChainError,
    ChainValueError,
    ChainEditError,
    ChainCreateError
}
