///<reference path='../typings/master.d.ts' />
var chai = require('chai');
var expect = chai.expect;
var async = require('async');
var _ = require('lodash');
var ironworks = require('ironworks');
var Service = ironworks.service.Service;
var EnvironmentWorker = ironworks.workers.EnvironmentWorker;
var RedisWorker = require('./RedisWorker');
var s;
var prefix = 'iw-redis-test.';
var test = {
    some: 'data'
};
describe('iw-redis', function () {
    beforeEach(function (done) {
        s = new Service('redis-test-service')
            .use(new EnvironmentWorker('test', {
            genericConnections: [{
                    name: 'test-redis-service',
                    host: '127.0.0.1',
                    port: '6379',
                    type: 'redis'
                }, {
                    name: 'test-sql-service',
                    host: '0.0.0.0',
                    port: '0',
                    type: 'sql'
                }]
        }))
            .use(new RedisWorker());
        s.info('ready', function () {
            done();
        });
        s.start();
    });
    it("should be able to set a redis key", function (done) {
        async.waterfall([
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.get', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to get a redis key", function (done) {
        async.waterfall([
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.get', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to delete a redis key", function (done) {
        async.waterfall([
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.del', prefix + 'set-test', function (e, res) {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.get', prefix + 'set-test', function (e, res) {
                    expect(res).to.be.null;
                    expect(e).to.be.null;
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to delete all redis keys that match a pattern", function (done) {
        async.waterfall([
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.check('iw-redis.del-pattern', prefix + '*', function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.keys', prefix + '*', function (e, res) {
                    expect(res.length).to.be.equal(0);
                    expect(e).to.be.null;
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to set multiple fields on a redis hash", function (done) {
        async.waterfall([
            function (cb) {
                s.request('iw-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, function (e, res) {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.hgetall', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to get all the fields on a redis hash", function (done) {
        async.waterfall([
            function (cb) {
                s.request('iw-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, function (e, res) {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.hgetall', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to add a redis set", function (done) {
        async.waterfall([
            function (cb) {
                s.request('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, function (e, res) {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.smembers', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(1);
                    var obj = JSON.parse(res[0]);
                    expect(obj.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to get all the members of a redis set", function (done) {
        async.waterfall([
            function (cb) {
                s.request('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, function (e, res) {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.smembers', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(1);
                    var obj = JSON.parse(res[0]);
                    expect(obj.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to remove an element from a redis set", function (done) {
        async.waterfall([
            function (cb) {
                s.request('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, function (e, res) {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.srem', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, function (e, res) {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.smembers', prefix + 'set-test', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(0);
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    it("should be able to get all redis keys that match a pattern", function (done) {
        async.waterfall([
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.check('iw-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, function (e) {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            function (cb) {
                s.request('iw-redis.keys', prefix + '*', function (e, res) {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(2);
                    expect(_.contains(res, prefix + 'set-test1')).to.be.true;
                    expect(_.contains(res, prefix + 'set-test2')).to.be.true;
                    cb(e);
                });
            }
        ], function (e) {
            expect(e).to.be.null;
            done();
        });
    });
    afterEach(function (done) {
        s.check('iw-redis.del-pattern', prefix + '*', function (e) {
            expect(e).to.be.null;
            s.dispose(function () {
                done();
            });
        });
    });
});
//# sourceMappingURL=RedisWorker.test.js.map