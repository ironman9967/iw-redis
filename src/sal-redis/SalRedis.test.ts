
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

import SalRedis = require('./SalRedis');

import ISet = require('./ISet');

var s: IService;

var vcapProp = 'VCAP_SERVICES_REDIS';
var vcap = process.env[vcapProp];
if (_.isUndefined(vcap)) {
    process.env[vcapProp] = JSON.stringify({
        "p-redis": [
            {
                "name": "test-redis-server",
                "label": "p-redis",
                "tags": [
                    "Data Stores",
                    "Data Store",
                    "Caching",
                    "Messaging and Queuing",
                    "key-value",
                    "caching",
                    "redis"
                ],
                "plan": "30mb",
                "credentials": {
                    "hostname": "127.0.0.1",
                    "port": "6379"
                }
            }
        ]
    });
}

var prefix = 'sal-redis-test.';
interface ITest {
    some: string;
}
var test: ITest = {
    some: 'data'
};

describe('sal-sql', () => {
    beforeEach((done) => {
        s = new Service('sal-sql-test')
            //.use(new LogWorker)
            .use(new SalRedis({
                vcapServices: vcapProp
            }));
        s.info<IServiceReady>('ready', (iw) => {
            done();
        });
        s.start();
    });

    it("should be able to set a redis key", (done) => {
        async.waterfall([
            (cb) => {
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('sal-redis.get', prefix + 'set-test', (e, res) => {
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
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('sal-redis.get', prefix + 'set-test', (e, res) => {
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
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, number> ('sal-redis.del', prefix + 'set-test', (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('sal-redis.get', prefix + 'set-test', (e, res) => {
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
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<string> ('sal-redis.del-pattern', prefix + '*', (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('sal-redis.keys', prefix + '*', (e, res) => {
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
                s.request<ISet, string>('sal-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, (e, res) => {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('sal-redis.hgetall', prefix + 'set-test', (e, res) => {
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
                s.request<ISet, string>('sal-redis.hmset', {
                    key: prefix + 'set-test',
                    value: test
                }, (e, res) => {
                    expect(res).to.be.equal('OK');
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, ITest> ('sal-redis.hgetall', prefix + 'set-test', (e, res) => {
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
                s.request<ISet, number>('sal-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('sal-redis.smembers', prefix + 'set-test', (e, res) => {
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
                s.request<ISet, number>('sal-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('sal-redis.smembers', prefix + 'set-test', (e, res) => {
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
                s.request<ISet, number>('sal-redis.sadd', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<ISet, number>('sal-redis.srem', {
                    key: prefix + 'set-test',
                    value: JSON.stringify(test)
                }, (e, res) => {
                    expect(res).to.be.equal(1);
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('sal-redis.smembers', prefix + 'set-test', (e, res) => {
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
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test1',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.check<ISet>('sal-redis.set', {
                    key: prefix + 'set-test2',
                    value: test
                }, (e) => {
                    expect(e).to.be.null;
                    cb(e);
                });
            },
            (cb) => {
                s.request<string, string[]> ('sal-redis.keys', prefix + '*', (e, res) => {
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
        s.check<string> ('sal-redis.del-pattern', prefix + '*', (e) => {
            expect(e).to.be.null;
            s.dispose(() => {
                done();
            });
        });
    });
});
