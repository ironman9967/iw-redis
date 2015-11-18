
declare module "redis-worker" {

    import ironworks = require('ironworks');

    import Worker = ironworks.workers.Worker;
    import IWorker = ironworks.workers.IWorker;
    import IWorkerChildOpts = ironworks.options.IWorkerChildOpts;

    export interface IRedisServer {
        hostname: string;
        port: string;
        password: string;
    }

    export interface ISet {
        key: string;
        value: string|any;
    }

    export interface IRedisWorkerOpts extends IWorkerChildOpts {
        vcapServices?: string;
        redisProp?: string;
    }

    export class RedisWorker extends Worker implements IWorker {
        constructor(opts?: IRedisWorkerOpts);
    }

}
