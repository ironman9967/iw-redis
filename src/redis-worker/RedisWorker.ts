
import _ = require('lodash');
import async = require('async');
import redis = require('redis');

import ironworks = require('ironworks');

import idHelper = ironworks.helpers.idHelper;

import Worker = ironworks.workers.Worker;
import IWorker = ironworks.workers.IWorker;
import IGenericConnection = ironworks.workers.IGenericConnection;
import ICommListener = ironworks.eventing.ICommListener;

import IRedisServer = require('./IRedisServer');
import ISet = require('./ISet');
import IBlock = require('./IBlock');
import IIncrBy = require('./IIncrBy');
import IListPop = require('./IListPop');
import IPublish = require('./IPublish');
import ISubscriptionMessage = require('./ISubscriptionMessage');
import IZAdd = require('./IZAdd');
import IZRemRangeByRank = require('./IZRemRangeByRank');
import IZRevRange = require('./IZRevRange');
import IZRem = require('./IZRem');

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
            if (!_.isUndefined(info.ex)) {
                this.client.expire(info.key, info.ex);
            }
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

        this.respond("get", (key,cb) => {
            async.waterfall([
                (cb) => {
                    this.client.get(key, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond("del",(key,cb) => {
            async.waterfall([
                (cb) => {
                    this.client.del(key, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });
        this.verify<string>('del-pattern', (pattern, cb) => {
            this.request<string, string[]>('keys', pattern, (e, keys) => {
                if (e !== null) {
                    cb(e);
                }
                else {
                    async.each(keys, (key, cb) => {
                        this.request('del', key, (e) => {
                            cb(e);
                        });
                    }, (e) => {
                        cb(e);
                    });
                }
            });
        });

        this.respond<ISet,any>("hmset",(data:ISet,cb) => {
            async.waterfall([
                (cb) => {
                    this.client.hmset(data.key, data.value, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<string,any>("hgetall",(key:string,cb) => {
            async.waterfall([
                (cb) => {
                    this.client.hgetall(key, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
            async.waterfall([
                (cb) => {
                    this.client.hgetall(key, (e, results) => {
                        cb(e, results)
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond("sadd", (data: ISet, cb) => {
            async.waterfall([
                (cb) => {
                    this.client.sadd(data.key, data.value, (e, results) => {
                        cb(e, results)
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond("smembers", (key: string, cb) => {
            async.waterfall([
                (cb) => {
                    this.client.smembers(key, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond("srem", (data: ISet, cb) => {
            async.waterfall([
                (cb) => {
                    this.client.srem(data.key, data.value, (e, results) => {
                        cb(e, results);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<IBlock, IListPop>('brpop', (block, cb) => {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args: any[] = RedisWorker.getKeyArray(block.key);
            async.waterfall([
                (cb) => {
                    this.client.brpop.apply(this.client, args.concat([
                        timeout,
                        (e, res) => {
                            cb(e, res);
                        }
                    ]));

                },
                (res) => {
                    RedisWorker.parseListPopResults((e, res) => {
                        cb(e, res);
                    }, res);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<IBlock, IListPop>('blpop', (block, cb) => {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args: any[] = RedisWorker.getKeyArray(block.key);
            async.waterfall([
                (cb) => {
                    this.client.blpop.apply(this.client, args.concat([
                        timeout,
                        (e, res) => {
                            cb(e, res);
                        }
                    ]));

                },
                (res) => {
                    RedisWorker.parseListPopResults((e, res) => {
                        cb(e, res);
                    }, res);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<ISet, any>('lpush', (data, cb) => {
            async.waterfall([
                (cb) => {
                    this.client.lpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, (e, res) => {
                        cb(e, res);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<ISet, any>('rpush', (data, cb) => {
            async.waterfall([
                (cb) => {
                    this.client.rpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, (e, res) => {
                        cb(e, res);
                    });
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<string|string[], string>('subscribe', (channels, cb) => {
            this.setSubClient();
            var args: any[] = RedisWorker.getKeyArray(channels);
            async.waterfall([
                (cb) => {
                    this.subClient.subscribe.apply(this.subClient, args.concat([(e, res) => {
                        cb(e, res);
                    }]));
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<IPublish, number>('publish', (pub, cb) => {
            var args: any[] = RedisWorker.getKeyArray(pub.channel);
            args.push(JSON.stringify(pub.value));
            async.waterfall([
                (cb) => {
                    this.client.publish.apply(this.client, args.concat([(e, res) => {
                        cb(e, res);
                    }]));
                },
                (results) => {
                    RedisWorker.parseKeyValuePairResults((e, res) => {
                        cb(e, res);
                    }, results);
                }
            ], (e) => {
                cb(e);
            });
        });

        this.respond<string|string[], string>('unsubscribe', (channels, cb) => {
            if (_.isUndefined(this.subClient)) {
                cb(null);
            }
            else {
                var args: any[] = RedisWorker.getKeyArray(channels);
                async.waterfall([
                    (cb) => {
                        this.subClient.unsubscribe.apply(this.subClient, args.concat([(e, res) => {
                            cb(e, res);
                        }]));
                    },
                    (results) => {
                        RedisWorker.parseKeyValuePairResults((e, res) => {
                            cb(e, res);
                        }, results);
                    }
                ], (e) => {
                    cb(e);
                });
            }
        });

        this.respond<IIncrBy, number>('incrby', (data, cb) => {
            this.client.incrby(data.key, data.value, (e, results) => {
                cb(e, results);
            });
        });

        this.respond<IZAdd, number>('zadd', (data, cb) => {
            this.client.zadd(data.key, data.score, data.member, (e, res) => {
                cb(e, res);
            });
        });

        this.respond<IZRemRangeByRank, number>('zremrangebyrank', (data, cb) => {
            this.client.zremrangebyrank(data.key, data.min, data.max, (e, res) => {
                cb(e, res);
            });
        });

        this.respond<IZRevRange, any[]>('zrevrange', (data, cb) => {
            let args: any = [
                data.key,
                data.start,
                data.stop
            ];
            if (data.withScores) {
                args.push('WITHSCORES');
            }
            this.client.zrevrange.apply(this.client, args.concat([(e, res) => {
                if (data.withScores) {
                    let processed = [];
                    for (let i = 0; i < res.length; i++) {
                        processed.push({
                            member: res[i],
                            score: res[++i] | 0
                        });
                    }
                    res = processed;
                }
                cb(e, res);
            }]));
        });

        this.respond<IZRem, number>('zrem', (data, cb) => {
            this.client.zrem(data.key, data.member, (e, res) => {
                cb(e, res);
            });
        });

        async.waterfall([
            (cb) => {
                this.getRedisCloudService((e) => {
                    cb(e);
                });
            },
            (cb) => {
                this.connect((e) => {
                    cb(e);
                });
            }
        ], (e) => {
            _.each<ICommListener>(this.allCommListeners(), (l) => {
                if (l.commEvent.worker === this.me.name) {
                    l.annotation = _.extend(l.annotation, {
                        internal: true
                    });
                }
            });
            if (!_.isUndefined(callback)) {
                callback(e);
            }
        });
        return this;
    }

    private static parseKeyValuePairResults(cb, results) {
        var errorOrObj = RedisWorker.parseJsonSafe(results);
        if (errorOrObj instanceof Error) {
            cb(errorOrObj);
        }
        else {
            if (typeof errorOrObj === 'string' && errorOrObj === 'null') {
                errorOrObj = null;
            }
            cb(null, errorOrObj);
        }
    }

    private static parseJsonSafe(obj): any {
        try{
            if(typeof obj === 'string' && obj.length > 0 && (obj[0]==='"' || obj[0]==='[' || obj[0]==='{' || obj[0]==='n'))
                obj = JSON.parse(obj);
        }catch(e){
            return e;
        }
        return obj;
    }

    private static parseListPopResults(cb, results) {
        if (results === null) {
            cb(null, {
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
            }, results.pop());
        }
    }

    private static getBlockTimeout(block: IBlock): number {
        return _.isUndefined(block.timeoutInSeconds) ? 0 : block.timeoutInSeconds;
    }

    private static getKeyArray(key: string|string[]): string[] {
        if (_.isArray(key)) {
            return <string[]>key;
        }
        else if ((<any>_).contains(key, ',')) {
            return (<string>key).split(',');
        }
        return [ <string>key ];
    }

    private connect(cb: (e: Error) => void) {
        this.client = redis.createClient(this.redisServer.port,this.redisServer.hostname);
        this.client.on('error', (e) => {
            this.inform('error', e)
        });
        if(!_.isUndefined(this.redisServer.password)){
            this.client.auth(this.redisServer.password, (e) => {
                cb(e);
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
                        password: (<any>_).get(c, 'data.credentials.password')
                    };
                    cb(null);
                }
            }
        );
    }

    private setSubClient() {
        if (_.isUndefined(this.subClient)) {
            this.subClient = redis.createClient(this.redisServer.port,this.redisServer.hostname);
			this.subClient.on('error', (e) => {
				this.inform('error', e)
			})
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
