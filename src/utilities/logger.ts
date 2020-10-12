import winston = require('winston');
import * as _ from 'lodash';
import configurations from '../configurations';

const {
  format,
} = winston;
const {
  loggingLevelForFile,
  loggingLevelForConsole,
} = configurations.logging;

const transports = [];
if (!_.isNil(loggingLevelForConsole)) {
  transports.push(
    new winston.transports.Console({
      level: loggingLevelForConsole.key,
      format: format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
      )
    })
  );
}

if (!_.isNil(loggingLevelForFile)) {
  transports.push(
    new winston.transports.File({
      level: loggingLevelForFile.key,
      filename: './logs/all-logs.log',
      handleExceptions: true,
      // json:             true,
      maxsize: 5242880, //5MB
      maxFiles: 5,
      // colorize:         false
    })
  );
}

// If the logger has no tranpsort it logs the following message to console (with the log content)
// [winston] Attempt to write logs with no transports ${LOG_OBJECT}
const logger = winston.createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    format.json(),
  ),
  transports: transports
});

export default logger;
