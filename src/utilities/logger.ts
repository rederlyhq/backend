import winston = require('winston');
const {
  format
} = winston;

const logger = winston.createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    format.json(),
  ),
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: './logs/all-logs.log',
      handleExceptions: true,
      // json:             true,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      // colorize:         false
    }),
    new winston.transports.Console({
      format: format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
      )
    })
  ]
});
export default logger;
