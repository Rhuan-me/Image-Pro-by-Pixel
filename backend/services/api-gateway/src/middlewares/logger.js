const morgan = require('morgan');
morgan.token('correlation-id', req => req.correlationId || '-');
module.exports = morgan(':method :url :status :response-time ms id=:correlation-id');
