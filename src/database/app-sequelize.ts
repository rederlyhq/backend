import * as sequelizeConfig from './sequelize-config';
import { Sequelize } from 'sequelize';

const appSequelize = new Sequelize(sequelizeConfig);

export default appSequelize;
