# Rederly Backend

![Version](https://img.shields.io/github/v/tag/rederly/backend?style=plastic)
![Commit Activity](https://img.shields.io/github/commit-activity/m/rederly/backend?style=plastic)
![License](https://img.shields.io/github/license/rederly/backend?style=plastic)
![Build Status](https://img.shields.io/github/workflow/status/rederly/backend/Node.js%20CI?style=plastic)

## Getting started:
1. Make sure below configurations are made in environment variables or .env file
2. Make sure the database specified (`DB_NAME`) exists and is accessible by the given user (and the user has the correct password)
3. Run `npm install` (first time and any time modules might have updated)
4. Run `npm start` (this will generate the database and then run the server)
5. If not already there run query for any required initial data

## Configurations
* Configurations are read from an environment variables in: src\configurations.ts
* These environment can be set by the system or by a .env file located at the root of this project (gitignored), .env expects key-value pairs with no space (i.e. `SERVER_PORT=8080`)
* You can not include or leave these values blank to get default values (however there is a configuration which defaults to true in production that the app will crash when missing configurations)

### Available configurations

#### Environment
| Environment variable | Description | Default value |
| --- | --- | --- |
| NODE_ENV | This is a standard environment variable which will make libraries behave differently (i.e. express). If set to `production` our application will be less verbose about error responses |  |
| BASE_DOMAIN | This is the base domain that should be used for all links. This is something like `rederly.com`. | |

#### Configuration handling
| Environment variable | Description | Default value |
| --- | --- | --- |
| LOG_MISSING_CONFIGURATIONS | Whether or not to log missing configurations | true |
| FAIL_ON_MISSING_CONFIGURATIONS | Whether or not to reject the loading promise on missing configurations | true in prod, false in dev |
| CONFIG_SALT | A random seed to better mask the configuration hash |  |

#### Temp files
| Environment variable | Description | Default value |
| --- | --- | --- |
| AUTO_DELETE_TEMP_FILES | Whether or not to delete temp files once done with them, meant for debugging and will log a warning in production | true |

#### Server
| Environment variable | Description | Default value |
| --- | --- | --- |
| SERVER_PORT | The port the server listens for requests on | 3000 |
| SERVER_BASE_PATH | The prefix for all path (i.e. `/rederly/api` | /backend-api |
| SERVER_LOG_INVALIDLY_PREFIXED_REQUESTS | Should there be an extra warning log when bad requests come in | true |
| SERVER_BLOCK_INVALIDLY_PREFIXED_REQUESTS | Should the socket be closed and end prematurely | true |
| SERVER_LOG_ACCESS | Whether or not to log healthy requests (faster than the threshold) | true |
| SERVER_LOG_ACCESS_SLOW_REQUEST_THRESHOLD | At what point to log an request with a warning that it is slow | 30000 |
| SERVER_REQUEST_TIMEOUT | The amount of time before the server gives up on responding in millis | 150000 |

##### Limiter
| Environment variable | Description | Default value |
| --- | --- | --- |
| SERVER_LIMITER_WINDOW_LENGTH | The window in which the max requests are allowed to be made (provided in milliseconds) | 60000 (ms, which is 1 minute) |
| SERVER_LIMITER_MAX_REQUESTS | The amount of requests that a single client is allowed to make in the above window | 100 |

#### Database
| Environment variable | Description | Default value |
| --- | --- | --- |
| DB_HOST | The host url for the database | localhost |
| DB_NAME | The name of the database | rederly |
| DB_USER | The user the login to the database | postgres |
| DB_PASSWORD | The password for the user to login to the database | password |
| DB_LOGGING | Whether or not queries should be output, used for debugging | false |
| DB_SYNC | Whether or not to sync with the database | false |
| DB_STATEMENT_TIMEOUT | Number of millis a db query is allowed to take (does not affect transactions) | 60000 |

#### Email
| Environment variable | Description | Default value |
| --- | --- | --- |
| EMAIL_ENABLED | Whether or not emails should be sent (for dev this should be false | false |
| EMAIL_FROM | The email address that will be sending the email | verifiedsendgridemail |
| EMAIL_SENDING_RATE | A throttle for how quickly requests should be pushed out (this avoids dropped requests based on limits) | null |
| AWS_SES_ACCESS_KEY | AWS SES access key | |
| AWS_SES_SECRET_KEY | AWS SES secret key | |
| AWS_REGION | The region for AWS SES | us-east-2 |

#### Auth
| Environment variable | Description | Default value |
| --- | --- | --- |
| AUTH_SESSION_LIFE | The number of minutes a session token is good for | 1440 (1 day) |
| AUTH_COST_FACTOR | The cost factor for bcrypt to hash the password (this is important for preventing brute force attacks as it makes the hash take time to calculate) | 8 |
| AUTH_TOKEN_LIFE | The default value for all other auth tokens | 1440 |
| AUTH_FORGOT_PASSWORD_TOKEN_LIFE | The amount of time you have to claim forgot password token | AUTH_TOKEN_LIFE=1440 |
| AUTH_VERIFY_INSTUTIONAL_EMAIL_TOKEN_LIFE | The amount of time you have to claim email verification | AUTH_TOKEN_LIFE=1440 |

#### Renderer
| Environment variable | Description | Default value |
| --- | --- | --- |
| RENDERER_URL | The base url for the renderer | http://localhost:3000 |
| RENDERER_REQUEST_TIMEOUT | The number of millis before requests to the renderer timeout | 75000 |

#### Renderer Open Labs
| Environment variable | Description | Default value |
| --- | --- | --- |
| OPENLAB_URL | The url for "Ask For Help" that links to open labs | |
| OPENLAB_REQUEST_TIMEOUT | The amount of time that openlabs has to respond to requests before timing out | 75000 |

#### Jira
| Environment variable | Description | Default value |
| --- | --- | --- |
| JIRA_ENABLED | Whether or not to try to make the ticket with jira. If false it makes info log with details | true |
| JIRA_EMAIL | The email used to authenticate with jira | |
| JIRA_API_KEY | The api key used to authenticate with jira | |
| JIRA_HOST | Where jira is hosted (currently cloud) | rederly.atlassian.net |
| JIRA_PROTOCOL | Protocol to use | https |
| JIRA_STRICT_SSL | Enforce ssl | true |
| JIRA_API_VERSION | API version | 2 |
| JIRA_PROJECT_KEY | The project to add tickets to (currently `Rederly Support`)| RS |

#### Logging
* Right now we use the default logging levels from winston (see logger-logging-levels.ts)
* This can be provided as a case insensitive string
* `null` is also an option to turn off that logger (case sensitive), if both are turned off winston will do console logs warning you that there are no transports

##### Logging Levels
* ERROR
* WARN
* INFO
* HTTP
* VERBOSE
* DEBUG
* SILLY
* null

| Environment variable | Description | Default value |
| --- | --- | --- |
| LOGGING_LEVEL | Fallback logging level for values below that are not provided | debug |
| LOGGING_LEVEL_FOR_FILE | The logging level for use with the file, pass null to turn off file logging | LOGGING_LEVEL |
| LOGGING_LEVEL_FOR_CONSOLE | The logging level for use with the console, pass null to turn off console logging | LOGGING_LEVEL |
| LOGGING_URL_IN_META | Whether or not to include the url in the request meta | false |
| LOGGING_META_IN_LOGS | Only applicable when LOGGING_LOG_JSON is false, whether or not to append meta to the end of the message | false |
| LOGGING_LOG_JSON | Whether or not logs to the console should be formatted or output as json | false in development true in production |

##### Scheduler
| Environment variable | Description | Default value |
| --- | --- | --- |
| SCHEDULER_BASE_PATH | The url to the scheduler | http://localhost:3003 |
| SCHEDULER_REQUEST_TIMEOUT | The amount of time it is allowed to take to make the request to the scheduler | 60000 |
| SCHEDULER_RESPONSE_TIMEOUT | The default amount of time it is allowed for the scheduler to respond back the backend | 180000 |

##### Attachments
| Environment variable | Description | Default value |
| --- | --- | --- |
| ATTACHMENTS_PRESIGNED_URL_BASE_URL | The base url to fetch the presigned url from for uploads (i.e. `http://example.com`/base/path) | '' |
| ATTACHMENTS_PRESIGNED_URL_BASE_PATH | The base path to fetch the presigned url for uploads (i.e. http://example.com`/base/path`) | '' |
| ATTACHMENTS_BASE_URL | The base path to be combined with the cloud filename for attachments | '' |
| ATTACHMENTS_PRESIGNED_URL_TIMEOUT | The amount of time it is allowed to take to get a presigned url | 60000 |

##### Importer
| Environment variable | Description | Default value |
| --- | --- | --- |
| IMPORTER_MISSING_FILE_THRESHOLD | The total amount of PG and asset files allowed to be missing while declaring a course archive import successful | 10 |