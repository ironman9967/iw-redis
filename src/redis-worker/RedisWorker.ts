
///<reference path='../typings/master.d.ts' />

import _ = require('lodash');
import async = require('async');
import redis = require('redis');

import ironworks = require('ironworks');

import idHelper = ironworks.helpers.idHelper;

import Worker = ironworks.workers.Worker;
import IWorker = ironworks.workers.IWorker;

import IRedisServer = require('./IRedisServer');
import ISet = require('./ISet');

import IRedisWorkerOpts = require('./IRedisWorkerOpts');

class RedisWorker extends Worker implements IWorker {
    public redisServer: IRedisServer;
    public client: redis.RedisClient;

    constructor(opts?: IRedisWorkerOpts) {
        super([], {
            id: idHelper.newId(),
            name: 'redis-worker'
        });
        var defOpts: IRedisWorkerOpts = {
            vcapServices: 'VCAP_SERVICES',
            redisProp: 'p-redis'
        };
        this.opts = this.opts.beAdoptedBy<IRedisWorkerOpts>(defOpts, 'worker');
        this.opts.merge(opts);
    }



    private redisSet(info: ISet, cb?) {
        var stringData;
        if(typeof info.value === "string"){
            stringData = info.value;
        }
        else {
            stringData = JSON.stringify(info.value);
        }
        this.client.set(info.key, stringData, (e) => {
            if (!_.isUndefined(cb)) {
                cb(e);
            }
        });
    }

    public init(comm, whoService, callback: (e: Error) => void) {
        this.setComm(comm, whoService);

        this.getRedisCloudService();

        this.info<ISet>("set",(info:ISet) => {
            this.redisSet(info);
        });
        this.verify<ISet>("set", (info: ISet, cb: (e: Error) => void) => {
            this.redisSet(info, (e) => {
                cb(e);
            });
        });

        this.respond("get",(key,cb) => {
            this.client.get(key,function(err,results){
                RedisWorker.parseResponseResults(cb,err,results);
            });
        });

        this.respond("del",(key,cb) => {
            this.client.del(key,function(err,results){
                RedisWorker.parseResponseResults(cb,err,results);
            });
        });
        this.verify<string>('del-pattern', (pattern, cb) => {
            this.request<string, string[]>('keys', pattern, (e, keys) => {
                if (e !== null) {
                    cb(e);
                }
                else {
                    async.each(keys, (key, cb) => {
                        this.request('del', key, (e, res) => {
                            cb(e);
                        });
                    }, (e) => {
                        cb(e);
                    });
                }
            });
        });

        this.respond<ISet,any>("hmset",(data:ISet,cb) => {
            this.client.hmset(data.key,data.value,function(err,results){
                RedisWorker.parseResponseResults(cb,err,results);
            });
        });

        this.respond<string,any>("hgetall",(key:string,cb) => {
            this.client.hgetall(key,function(err,results){
                RedisWorker.parseResponseResults(cb,err,results);
            });
        });

        this.respond("sadd", (data: ISet, cb) => {
            this.client.sadd(data.key, data.value, (err, results) => {
                RedisWorker.parseResponseResults(cb, err, results);
            });
        });

        this.respond("smembers", (key: string, cb) => {
            this.client.smembers(key, (err, results) => {
                RedisWorker.parseResponseResults(cb, err, results);
            });
        });

        this.respond("srem", (data: ISet, cb) => {
            this.client.srem(data.key, data.value, (err, results) => {
                RedisWorker.parseResponseResults(cb, err, results);
            });
        });

        this.respond<string, string[]>('keys', (pattern, cb) => {
            this.client.keys(pattern, (e, keys) => {
                cb(e, keys);
            });
        });

        this.connect(function(err){
            if (!_.isUndefined(callback)) {
                callback(err);
            }
        });
    }

    private static parseResponseResults(cb, err, results) {
        if(err){
            cb(err);
        } else {
            var err;
            var obj = results;
            try{
                if(typeof obj === 'string' && obj.length > 0 && (obj[0]==='"' || obj[0]==='[' || obj[0]==='{'))
                    obj = JSON.parse(results);
            }catch(e){
                err=e;
            }
            cb(err,obj);
        }
    }

    private connect(cb) {
        this.client = redis.createClient(this.redisServer.port,this.redisServer.hostname);
        if(!_.isUndefined(this.redisServer.password)){
            this.client.auth(this.redisServer.password, (err) => {
                cb(err);
            });
        } else {
            cb(null);
        }

    }

    private getRedisCloudService() {
        var services = JSON.parse(process.env[this.opts.get<string>('vcapServices')]);
        this.redisServer = _.first(_.reduce(services[this.opts.get<string>('redisProp')], (memo:IRedisServer[], service) => {
            memo.push(<IRedisServer>{
                hostname: service.credentials.host,
                port: service.credentials.port,
                password: service.credentials.password
            });
            return memo;
        },[]));
    }

    public dispose(callback?: () => void) {
        this.client.end();
        if (!_.isUndefined(callback)) {
            process.nextTick(() => {
                callback();
            });
        }
    }
}

export = RedisWorker;
