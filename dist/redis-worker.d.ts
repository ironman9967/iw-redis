
declare module "redis-worker" {

    export interface IRedisServer {
        hostname: string;
        port: string;
        password: string;
    }

    export interface ISet {
        key: string;
        value: string|any;
    }

    export interface IRedisWorkerOpts {
        vcapServices?: string;
        redisProp?: string;
    }

    export class RedisWorker {
        constructor(opts?: IRedisWorkerOpts);
    }

}
