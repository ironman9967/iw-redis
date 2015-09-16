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
var SalRedis = (function (_super) {
    __extends(SalRedis, _super);
    function SalRedis(opts) {
        _super.call(this, [], {
            id: idHelper.newId(),
            name: 'sal-redis'
        });
        var defOpts = {
            vcapServices: 'VCAP_SERVICES',
            redisProp: 'p-redis'
        };
        this.opts = this.opts.beAdoptedBy(defOpts, 'worker');
        this.opts.merge(opts);
    }
    SalRedis.prototype.redisSet = function (info, cb) {
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
    SalRedis.prototype.init = function (comm, whoService, callback) {
        var _this = this;
        this.setComm(comm, whoService);
        this.getRedisCloudService();
        this.info("set", function (info) {
            _this.redisSet(info);
        });
        this.verify("set", function (info, cb) {
            _this.redisSet(info, function (e) {
                cb(e);
            });
        });
        this.respond("get", function (key, cb) {
            _this.client.get(key, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond("del", function (key, cb) {
            _this.client.del(key, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.verify('del-pattern', function (pattern, cb) {
            _this.request('keys', pattern, function (e, keys) {
                if (e !== null) {
                    cb(e);
                }
                else {
                    async.each(keys, function (key, cb) {
                        _this.request('del', key, function (e, res) {
                            cb(e);
                        });
                    }, function (e) {
                        cb(e);
                    });
                }
            });
        });
        this.respond("hmset", function (data, cb) {
            _this.client.hmset(data.key, data.value, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond("hgetall", function (key, cb) {
            _this.client.hgetall(key, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond("sadd", function (data, cb) {
            _this.client.sadd(data.key, data.value, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond("smembers", function (key, cb) {
            _this.client.smembers(key, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond("srem", function (data, cb) {
            _this.client.srem(data.key, data.value, function (err, results) {
                SalRedis.parseResponseResults(cb, err, results);
            });
        });
        this.respond('keys', function (pattern, cb) {
            _this.client.keys(pattern, function (e, keys) {
                cb(e, keys);
            });
        });
        this.connect(function (err) {
            if (!_.isUndefined(callback)) {
                callback(err);
            }
        });
    };
    SalRedis.parseResponseResults = function (cb, err, results) {
        if (err) {
            cb(err);
        }
        else {
            var err;
            var obj = results;
            try {
                if (typeof obj === 'string' && obj.length > 0 && (obj[0] === '"' || obj[0] === '[' || obj[0] === '{'))
                    obj = JSON.parse(results);
            }
            catch (e) {
                err = e;
            }
            cb(err, obj);
        }
    };
    SalRedis.prototype.connect = function (cb) {
        this.client = redis.createClient(this.redisServer.port, this.redisServer.hostname);
        if (!_.isUndefined(this.redisServer.password)) {
            this.client.auth(this.redisServer.password, function (err) {
                cb(err);
            });
        }
        else {
            cb(null);
        }
    };
    SalRedis.prototype.getRedisCloudService = function () {
        var services = JSON.parse(process.env[this.opts.get('vcapServices')]);
        this.redisServer = _.first(_.reduce(services[this.opts.get('redisProp')], function (memo, service) {
            memo.push({
                hostname: service.credentials.hostname,
                port: service.credentials.port,
                password: service.credentials.route
            });
            return memo;
        }, []));
    };
    SalRedis.prototype.dispose = function (callback) {
        this.client.end();
        if (!_.isUndefined(callback)) {
            process.nextTick(function () {
                callback();
            });
        }
    };
    return SalRedis;
})(Worker);
module.exports = SalRedis;
//# sourceMappingURL=SalRedis.js.map