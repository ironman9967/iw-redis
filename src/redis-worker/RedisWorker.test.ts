
///<reference path='../typings/master.d.ts' />

import chai = require('chai');
var expect = chai.expect;

import async = require('async');
import _ = require('lodash');

import ironworks = require('ironworks');
import Service = ironworks.service.Service;
import IService = ironworks.service.IService;
import IServiceReady = ironworks.service.IServiceReady;
import IWorker = ironworks.workers.IWorker;
import LogWorker = ironworks.workers.LogWorker;
import EnvironmentWorker = ironworks.workers.EnvironmentWorker;

import RedisWorker = require('./RedisWorker');

import ISet = require('./ISet');

var s: IService;
var prefix = 'iw-redis-test.';
interface ITest {
    some: string;
}
var test: ITest = {
    some: 'data'
};

describe('iw-redis', () => {
    beforeEach((done) => {
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
        s.info<IServiceReady>('ready', () => {
            done();
        });
        s.start();
    });

    it("should be able to set a redis key", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('iw-redis.get', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to get a redis key", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('iw-redis.get', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to delete a redis key", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, number> ('iw-redis.del', prefix + 'set-test', (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('iw-redis.get', prefix + 'set-test', (e, res) => {
                    expect(res).to.be.null;
                    expect(e).to.be.null;
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to delete all redis keys that match a pattern", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<string> ('iw-redis.del-pattern', prefix + '*', (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('iw-redis.keys', prefix + '*', (e, res) => {
                    expect(res.length).to.be.equal(0);
                    expect(e).to.be.null;
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to set multiple fields on a redis hash", (done) => {
        async.waterfall([
            (cb) => {
                s.request<ISet, string>('iw-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, (e, res) => {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('iw-redis.hgetall', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to get all the fields on a redis hash", (done) => {
        async.waterfall([
            (cb) => {
                s.request<ISet, string>('iw-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, (e, res) => {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('iw-redis.hgetall', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to add a redis set", (done) => {
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('iw-redis.smembers', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(1);
                    var obj: ITest = JSON.parse(res[0]);
                    expect(obj.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to get all the members of a redis set", (done) => {
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('iw-redis.smembers', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(1);
                    var obj: ITest = JSON.parse(res[0]);
                    expect(obj.some).to.be.equal('data');
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to remove an element from a redis set", (done) => {
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<ISet, number>('iw-redis.srem', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('iw-redis.smembers', prefix + 'set-test', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(0);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to get all redis keys that match a pattern", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<ISet>('iw-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('iw-redis.keys', prefix + '*', (e, res) => {
                    expect(e).to.be.null;
                    expect(res.length).to.be.equal(2);
                    expect(_.contains(res, prefix + 'set-test1')).to.be.true;
                    expect(_.contains(res, prefix + 'set-test2')).to.be.true;
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    afterEach((done) => {
        s.check<string> ('iw-redis.del-pattern', prefix + '*', (e) => {
            expect(e).to.be.null;
            s.dispose(() => {
                done();
            });
        });
    });
});
