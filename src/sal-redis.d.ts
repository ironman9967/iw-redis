
declare module "sal-redis" {

    export interface IRedisServer {
        hostname: string;
        port: string;
        password: string;
    }

    export interface ISet {
        key: string;
        value: string|any;
    }

    export interface ISalRedisOpts {
        vcapServices?: string;
        redisProp?: string;
    }

    export class SalRedis {
        constructor(opts?: ISalRedisOpts);
    }

}
