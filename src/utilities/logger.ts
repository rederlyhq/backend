import winston = require('winston');
import * as _ from 'lodash';
import configurations from '../configurations';
import { rederlyRequestNamespaceDump } from '../middleware/rederly-request-namespace';

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
      format: configurations.logging.logJson ? undefined : format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.printf(info => {
          const requestMetadata = _.omitBy(info.metadata.requestMeta, _.isUndefined);
          const requestId = `request-${(requestMetadata.requestId ?? 'null')}-${requestMetadata.userId ?? 'null'}`;
          let message = `${info.timestamp} [${info.level}]: ${requestId} ${info.message}`;
          if (configurations.logging.metaInLogs) {
            const requestMetadataString = _.isEmpty(requestMetadata) ? '' : JSON.stringify(requestMetadata);
            message += requestMetadataString;
          }
          return message;
        }),
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
  defaultMeta: {
    get requestMeta(): unknown {
      return rederlyRequestNamespaceDump();
    },
  },
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    format.json(),
  ),
  transports: transports
});

export default logger;
