///<reference path='../typings/master.d.ts' />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _ = require('lodash');
var async = require('async');
var redis = require('redis');
var ironworks = require('ironworks');
var idHelper = ironworks.helpers.idHelper;
var Worker = ironworks.workers.Worker;
var RedisWorker = (function (_super) {
    __extends(RedisWorker, _super);
    function RedisWorker(opts) {
        _super.call(this, [], {
            id: idHelper.newId(),
            name: 'iw-redis'
        }, opts);
        var defOpts = {};
        this.opts = this.opts.beAdoptedBy(defOpts, 'worker');
        this.opts.merge(opts);
    }
    RedisWorker.prototype.redisSet = function (info, cb) {
        var stringData;
        if (typeof info.value === "string") {
            stringData = info.value;
        }
        else {
            stringData = JSON.stringify(info.value);
        }
        this.client.set(info.key, stringData, function (e) {
            if (!_.isUndefined(cb)) {
                cb(e);
            }
        });
    };
    RedisWorker.prototype.init = function (callback) {
        var _this = this;
        this.respond('keys', function (pattern, cb) {
            _this.client.keys(pattern, function (e, keys) {
                cb(e, keys);
            });
        });
        this.info("set", function (info) {
            _this.redisSet(info);
        });
        this.verify("set", function (info, cb) {
            _this.redisSet(info, function (e) {
                cb(e);
            });
        });
        this.respond("get", function (key, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.get(key, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond("del", function (key, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.del(key, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.verify('del-pattern', function (pattern, cb) {
            _this.request('keys', pattern, function (e, keys) {
                if (e !== null) {
                    cb(e);
                }
                else {
                    async.each(keys, function (key, cb) {
                        _this.request('del', key, function (e) {
                            cb(e);
                        });
                    }, function (e) {
                        cb(e);
                    });
                }
            });
        });
        this.respond("hmset", function (data, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.hmset(data.key, data.value, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond("hgetall", function (key, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.hgetall(key, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
            async.waterfall([
                function (cb) {
                    _this.client.hgetall(key, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond("sadd", function (data, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.sadd(data.key, data.value, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond("smembers", function (key, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.smembers(key, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond("srem", function (data, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.srem(data.key, data.value, function (e, results) {
                        cb(e, results);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('brpop', function (block, cb) {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args = RedisWorker.getKeyArray(block.key);
            async.waterfall([
                function (cb) {
                    _this.client.brpop.apply(_this.client, args.concat([
                        timeout,
                        function (e, res) {
                            cb(e, res);
                        }
                    ]));
                },
                function (res) {
                    RedisWorker.parseListPopResults(function (e, res) {
                        cb(e, res);
                    }, res);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('blpop', function (block, cb) {
            var timeout = RedisWorker.getBlockTimeout(block);
            var args = RedisWorker.getKeyArray(block.key);
            async.waterfall([
                function (cb) {
                    _this.client.blpop.apply(_this.client, args.concat([
                        timeout,
                        function (e, res) {
                            cb(e, res);
                        }
                    ]));
                },
                function (res) {
                    RedisWorker.parseListPopResults(function (e, res) {
                        cb(e, res);
                    }, res);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('lpush', function (data, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.lpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, function (e, res) {
                        cb(e, res);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('rpush', function (data, cb) {
            async.waterfall([
                function (cb) {
                    _this.client.rpush(data.key, _.isObject(data.value) ? JSON.stringify(data.value) : data.value, function (e, res) {
                        cb(e, res);
                    });
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('subscribe', function (channels, cb) {
            _this.setSubClient();
            var args = RedisWorker.getKeyArray(channels);
            async.waterfall([
                function (cb) {
                    _this.subClient.subscribe.apply(_this.subClient, args.concat([function (e, res) {
                            cb(e, res);
                        }]));
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('publish', function (pub, cb) {
            var args = RedisWorker.getKeyArray(pub.channel);
            args.push(JSON.stringify(pub.value));
            async.waterfall([
                function (cb) {
                    _this.client.publish.apply(_this.client, args.concat([function (e, res) {
                            cb(e, res);
                        }]));
                },
                function (results) {
                    RedisWorker.parseKeyValuePairResults(function (e, res) {
                        cb(e, res);
                    }, results);
                }
            ], function (e) {
                cb(e);
            });
        });
        this.respond('unsubscribe', function (channels, cb) {
            if (_.isUndefined(_this.subClient)) {
                cb(null);
            }
            else {
                var args = RedisWorker.getKeyArray(channels);
                async.waterfall([
                    function (cb) {
                        _this.subClient.unsubscribe.apply(_this.subClient, args.concat([function (e, res) {
                                cb(e, res);
                            }]));
                    },
                    function (results) {
                        RedisWorker.parseKeyValuePairResults(function (e, res) {
                            cb(e, res);
                        }, results);
                    }
                ], function (e) {
                    cb(e);
                });
            }
        });
        async.waterfall([
            function (cb) {
                _this.getRedisCloudService(function (e) {
                    cb(e);
                });
            },
            function (cb) {
                _this.connect(function (e) {
                    cb(e);
                });
            }
        ], function (e) {
            _.each(_this.allCommListeners(), function (l) {
                if (l.commEvent.worker === _this.me.name) {
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
    };
    RedisWorker.parseKeyValuePairResults = function (cb, results) {
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
    };
    RedisWorker.parseJsonSafe = function (obj) {
        try {
            if (typeof obj === 'string' && obj.length > 0 && (obj[0] === '"' || obj[0] === '[' || obj[0] === '{' || obj[0] === 'n'))
                obj = JSON.parse(obj);
        }
        catch (e) {
            return e;
        }
        return obj;
    };
    RedisWorker.parseListPopResults = function (cb, results) {
        if (results === null) {
            cb(null, {
                list: null,
                value: null
            });
        }
        else {
            var listName = results.shift();
            RedisWorker.parseKeyValuePairResults(function (e, obj) {
                if (e !== null) {
                    cb(e);
                }
                else {
                    cb(null, {
                        list: listName,
                        value: obj
                    });
                }
            }, results.pop());
        }
    };
    RedisWorker.getBlockTimeout = function (block) {
        return _.isUndefined(block.timeoutInSeconds) ? 0 : block.timeoutInSeconds;
    };
    RedisWorker.getKeyArray = function (key) {
        if (_.isArray(key)) {
            return key;
        }
        else if (_.contains(key, ',')) {
            return key.split(',');
        }
        return [key];
    };
    RedisWorker.prototype.connect = function (cb) {
        this.client = redis.createClient(this.redisServer.port, this.redisServer.hostname);
        if (!_.isUndefined(this.redisServer.password)) {
            this.client.auth(this.redisServer.password, function (e) {
                cb(e);
            });
        }
        else {
            cb(null);
        }
    };
    RedisWorker.prototype.getRedisCloudService = function (cb) {
        var _this = this;
        var envEvts = _.reduce(this.allCommListeners(), function (envWorkers, l) {
            if (l.commEvent.worker.indexOf('iw-env') === 0 && l.commEvent.name === 'list-generic-connections') {
                envWorkers.push(l.commEvent);
            }
            return envWorkers;
        }, []);
        var redisConns = [];
        async.whilst(function () {
            return envEvts.length > 0;
        }, function (cb) {
            var envEvt = envEvts.pop();
            _this.ask(envEvt, function (e, genConn) {
                redisConns = redisConns.concat(_.filter(genConn, function (gc) {
                    return gc.type === 'redis';
                }));
                cb(null);
            });
        }, function (e) {
            if (e !== null) {
                cb(e);
            }
            else if (redisConns.length === 0) {
                cb(new Error('no redis connection found'));
            }
            else {
                var c = redisConns[0];
                _this.redisServer = {
                    hostname: c.host,
                    port: c.port,
                    password: c.password
                };
                cb(null);
            }
        });
    };
    RedisWorker.prototype.setSubClient = function () {
        var _this = this;
        if (_.isUndefined(this.subClient)) {
            this.subClient = redis.createClient(this.redisServer.port, this.redisServer.hostname);
            this.subClient.on('message', function (channel, message) {
                _this.inform('message-' + channel.replace(/\./g, '-'), RedisWorker.parseJsonSafe(message));
                _this.inform('message', {
                    channel: channel,
                    value: RedisWorker.parseJsonSafe(message)
                });
            });
            this.subClient.on('unsubscribe', function (channel, count) {
                if (count === 0) {
                    _this.subClient.end();
                    _this.subClient = void 0;
                }
            });
        }
    };
    RedisWorker.prototype.dispose = function (callback) {
        if (!_.isUndefined(this.subClient)) {
            this.subClient.removeAllListeners('message');
            this.subClient.end();
        }
        if (!_.isUndefined(callback)) {
            process.nextTick(function () {
                callback();
            });
        }
    };
    return RedisWorker;
})(Worker);
module.exports = RedisWorker;
//# sourceMappingURL=RedisWorker.js.map