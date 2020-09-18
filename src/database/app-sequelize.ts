import * as sequelizeConfig from './sequelize-config';
// When changing to import it creates the following compiling error (on instantiation): This expression is not constructable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sequelize = require('sequelize');
import cls = require('cls-hooked');
const namespace = cls.createNamespace('rederly-backend-api');
Sequelize.useCLS(namespace);

const appSequelize = new Sequelize(sequelizeConfig);

export default appSequelize;
