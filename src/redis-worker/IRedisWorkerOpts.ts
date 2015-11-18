
import ironworks = require('ironworks');

import IWorkerChildOpts = ironworks.options.IWorkerChildOpts;

interface IRedisWorkerOpts extends IWorkerChildOpts {
    vcapServices?: string;
    redisProp?: string;
}

export = IRedisWorkerOpts;
