
///<reference path='../typings/master.d.ts' />

import _ = require('lodash');
import async = require('async');
import redis = require('redis');

import ironworks = require('ironworks');

import idHelper = ironworks.helpers.idHelper;

import Worker = ironworks.workers.Worker;
import IWorker = ironworks.workers.IWorker;
import IGenericConnection = ironworks.workers.IGenericConnection;

import IRedisServer = require('./IRedisServer');
import ISet = require('./ISet');

import IRedisWorkerOpts = require('./IRedisWorkerOpts');

class RedisWorker extends Worker implements IWorker {
    public redisServer: IRedisServer;
    public client: redis.RedisClient;

    constructor(opts?: IRedisWorkerOpts) {
        super([], {
            id: idHelper.newId(),
            name: 'iw-redis'
        }, opts);
        var defOpts: IRedisWorkerOpts = {};
        this.opts = this.opts.beAdoptedBy<IRedisWorkerOpts>(defOpts, 'worker');
        this.opts.merge(opts);
    }

    private redisSet(info: ISet, cb?) {
        var stringData;
        if(typeof info.value === "string") {
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

    public init(callback?: (e: Error) => void): IWorker {
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

        this.getRedisCloudService((e) => {
            if (e !== null && !_.isUndefined(callback)) {
                callback(e);
            }
            else {
                this.connect((e) => {
                    if (e !== null && !_.isUndefined(callback)) {
                        callback(e);
                    }
                    else {
                        super.init(callback);
                    }
                });
            }
        });
        return this;
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

    private getRedisCloudService(cb: (e: Error) => void) {
        var envEvts = _.reduce(this.allCommListeners(), (envWorkers, l) => {
            if (l.commEvent.worker.indexOf('iw-env') === 0 && l.commEvent.name === 'list-generic-connections') {
                envWorkers.push(l.commEvent);
            }
            return envWorkers;
        }, []);
        var redisConns = [];
        async.whilst(
            () => {
                return envEvts.length > 0;
            },
            (cb) => {
                var envEvt = envEvts.pop();
                this.ask<IGenericConnection[]>(envEvt, (e, genConn) => {
                    redisConns = redisConns.concat(_.filter(genConn, (gc) => {
                        return gc.type === 'redis';
                    }));
                    cb(null);
                });
            },
            (e) => {
                if (e !== null) {
                    cb(e);
                }
                else if (redisConns.length === 0) {
                    cb(new Error('no redis connection found'));
                }
                else {
                    var c = redisConns[0];
                    this.redisServer = <IRedisServer>{
                        hostname: c.host,
                        port: c.port,
                        password: c.password
                    };
                    cb(null);
                }
            }
        );
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
