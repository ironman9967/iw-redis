
///<reference path='../typings/main.d.ts' />

declare module "redis-worker" {

    import ironworks = require('ironworks');

    import Worker = ironworks.workers.Worker;
    import IWorker = ironworks.workers.IWorker;
    import IWorkerChildOpts = ironworks.options.IWorkerChildOpts;

    export interface IRedisServer {
        hostname: string;
        port: string;
        password: string; inst
    }

    export interface ISet {
        key: string;
        value: string|any;
        ex?: number;
    }

    export interface IBlock {
        key: string|string[];
        timeoutInSeconds?: number;
    }

    export interface IListPop {
        list: string;
        value: any;
    }

    export interface ISubscriptionMessage {
        channel: string;
        value: any;
    }

    export interface IPublish {
        channel: string|string[];
        value: any;
    }

    export interface IRedisWorkerOpts extends IWorkerChildOpts {}

    export class RedisWorker extends Worker implements IWorker {
        constructor(opts?: IRedisWorkerOpts);
    }

}
