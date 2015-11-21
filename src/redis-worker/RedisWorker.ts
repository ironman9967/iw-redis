
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
import IBlock = require('./IBlock');
import IListPop = require('./IListPop');
import IPublish = require('./IPublish');
import ISubscriptionMessage = require('./ISubscriptionMessage');

import IRedisWorkerOpts = require('./IRedisWorkerOpts');

class RedisWorker extends Worker implements IWorker {
    public redisServer: IRedisServer;
    public client: redis.RedisClient;
    public subClient: redis.RedisClient;

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
        this.respond<string, string[]>('keys', (pattern, cb) => {
            this.client.keys(pattern, (e, keys) => {
                cb(e, keys);
            });
        });

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
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                },err,results);
            });
        });

        this.respond("del",(key,cb) => {
            this.client.del(key,function(err,results){
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                },err,results);
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
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                },err,results);
            });
        });

        this.respond<string,any>("hgetall",(key:string,cb) => {
            this.client.hgetall(key,function(err,results){
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                },err,results);
            });
        });

        this.respond("sadd", (data: ISet, cb) => {
            this.client.sadd(data.key, data.value, (err, results) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, err, results);
            });
        });

        this.respond("smembers", (key: string, cb) => {
            this.client.smembers(key, (err, results) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, err, results);
            });
        });

        this.respond("srem", (data: ISet, cb) => {
            this.client.srem(data.key, data.value, (err, results) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, err, results);
            });
        });

        this.respond<IBlock, IListPop>('brpop', (block, cb) => {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args: any[] = RedisWorker.getKeyArray(block.key);
            this.client.brpop.apply(this.client, args.concat([
                timeout,
                (e, res) => {
                    RedisWorker.parseListPopResults((e, res) => {
                        cb(e, res);
                    }, e, res);
                }
            ]));
        });

        this.respond<IBlock, IListPop>('blpop', (block, cb) => {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args: any[] = RedisWorker.getKeyArray(block.key);
            this.client.blpop.apply(this.client, args.concat([
                timeout,
                (e, res) => {
                    RedisWorker.parseListPopResults((e, res) => {
                        cb(e, res);
                    }, e, res);
                }
            ]));
        });

        this.respond<ISet, any>('lpush', (data, cb) => {
            this.client.lpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, (e, res) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, e, res);
            });
        });

        this.respond<ISet, any>('rpush', (data, cb) => {
            this.client.rpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, (e, res) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, e, res);
            });
        });

        this.respond<string|string[], string>('subscribe', (channels, cb) => {
            this.setSubClient();
            var args: any[] = RedisWorker.getKeyArray(channels);
            this.subClient.subscribe.apply(this.subClient, args.concat([(e, res) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    cb(e, res);
                }, e, res);
            }]));
        });

        this.respond<IPublish, number>('publish', (pub, cb) => {
            var client = redis.createClient(this.redisServer.port,this.redisServer.hostname);
            var args: any[] = RedisWorker.getKeyArray(pub.channel);
            args.push(JSON.stringify(pub.value));
            client.publish.apply(client, args.concat([(e, res) => {
                RedisWorker.parseKeyValuePairResults((e, res) => {
                    client.end();
                    cb(e, res);
                }, e, res);
            }]));
        });

        this.respond<string|string[], string>('unsubscribe', (channels, cb) => {
            if (_.isUndefined(this.subClient)) {
                cb(null);
            }
            else {
                var args: any[] = RedisWorker.getKeyArray(channels);
                this.subClient.unsubscribe.apply(this.subClient, args.concat([(e, res) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, e, res);
                }]));
            }
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

    private static parseKeyValuePairResults(cb, e, results) {
        if (e !== null) {
            cb(e);
        } else {
            var errorOrObj = RedisWorker.parseJsonSafe(results);
            if (errorOrObj instanceof Error) {
                cb(errorOrObj);
            }
            else {
                cb(null, errorOrObj);
            }
        }
    }

    private static parseJsonSafe(obj): any {
        try{
            if(typeof obj === 'string' && obj.length > 0 && (obj[0]==='"' || obj[0]==='[' || obj[0]==='{'))
                obj = JSON.parse(obj);
        }catch(e){
            return e;
        }
        return obj;
    }

    private static parseListPopResults(cb, e, results) {
        if (e !== null) {
            cb(e);
        }
        else if (results === null) {
            cb(e, {
                list: null,
                value: null
            })
        }
        else {
            var listName = results.shift();
            RedisWorker.parseKeyValuePairResults((e, obj) => {
                if (e !== null) {
                    cb(e);
                }
                else {
                    cb(null, {
                        list: listName,
                        value: obj
                    })
                }
            }, e, results.pop());
        }
    }

    private static getBlockTimeout(block: IBlock): number {
        return _.isUndefined(block.timeoutInSeconds) ? 0 : block.timeoutInSeconds;
    }

    private static getKeyArray(key: string|string[]): string[] {
        if (_.isArray(key)) {
            return <string[]>key;
        }
        else if (_.contains(key, ',')) {
            return (<string>key).split(',');
        }
        return [ <string>key ];
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

    private setSubClient() {
        if (_.isUndefined(this.subClient)) {
            this.subClient = redis.createClient(this.redisServer.port,this.redisServer.hostname);
            this.subClient.on('message', (channel, message) => {
                this.inform('message-' + channel.replace(/\./g, '-'), RedisWorker.parseJsonSafe(message));
                this.inform<ISubscriptionMessage>('message', {
                    channel: channel,
                    value: RedisWorker.parseJsonSafe(message)
                });
            });
            this.subClient.on('unsubscribe', (channel, count) => {
                if (count === 0) {
                    this.subClient.end();
                    this.subClient = void 0;
                }
            });
        }
    }

    public dispose(callback?: () => void) {
        this.client.end();
        if (!_.isUndefined(this.subClient)) {
            this.subClient.removeAllListeners('message');
            this.subClient.end();
        }
        if (!_.isUndefined(callback)) {
            process.nextTick(() => {
                callback();
            });
        }
    }
}

export = RedisWorker;
