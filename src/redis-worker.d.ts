
/// <reference path='./typings/index.d.ts' />

declare module "iw-redis" {
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
	
	export interface IIncrBy {
	    key: string;
	    value: number;
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
	
	export interface IZAdd {
	    key: string;
	    score: number;
	    member: string;
	}
	
	export interface IZRevRange {
	    key: string;
	    start: number;
	    stop: number;
	    withScores: boolean;
	}
	
	export interface IZRemRangeByRank {
	    key: string;
	    min: number;
	    max: number;
	}
	
	export interface IZRem {
	    key: string;
	    member: string;
	}

	export interface IRedisWorkerOpts extends IWorkerChildOpts {}

	export class RedisWorker extends Worker implements IWorker {
	    constructor(opts?: IRedisWorkerOpts);
	}
}
