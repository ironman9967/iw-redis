
import ironworks = require('ironworks');

import IWorkerChildOpts = ironworks.options.IWorkerChildOpts;

interface IRedisWorkerOpts extends IWorkerChildOpts {
    vcapServices?: string;
    sqlProp?: string;
    dbName?: string;
    dialect?: string;
    sequelize?: any;
}

export = IRedisWorkerOpts;
