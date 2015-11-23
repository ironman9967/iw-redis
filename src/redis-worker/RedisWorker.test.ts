
///<reference path='../typings/master.d.ts' />

import chai = require('chai');
var expect = chai.expect;

import async = require('async');
import _ = require('lodash');
import redis = require('redis');

import ironworks = require('ironworks');
import Service = ironworks.service.Service;
import IService = ironworks.service.IService;
import IServiceReady = ironworks.service.IServiceReady;
import IWorker = ironworks.workers.IWorker;
import LogWorker = ironworks.workers.LogWorker;
import EnvironmentWorker = ironworks.workers.EnvironmentWorker;

import RedisWorker = require('./RedisWorker');

import ISet = require('./ISet');
import IBlock = require('./IBlock');
import IListPop = require('./IListPop');
import IPublish = require('./IPublish');
import ISubscriptionMessage = require('./ISubscriptionMessage');

var s: IService;
var prefix = 'iw-redis-test-';
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
            s.check<string> ('iw-redis.del-pattern', prefix + '*', (e) => {
                expect(e).to.be.null;
                done();
            });
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
                    expect(res.some).to.be.equal(test.some);
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
                    expect(res.some).to.be.equal(test.some);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be return null when getting a redis key that isn't set", (done) => {
        s.request<string, ITest> ('iw-redis.get', prefix + 'null-test', (e, res) => {
            expect(e).to.be.null;
            expect(res).to.be.equal(null);
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
                    expect(res.some).to.be.equal(test.some);
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
                    expect(res.some).to.be.equal(test.some);
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
                    expect(obj.some).to.be.equal(test.some);
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
                    expect(obj.some).to.be.equal(test.some);
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

    it("should be able to push a value onto the left side of a list and provide a block right pop to retrieve the value", (done) => {
        var listKey = prefix + 'lpush-brpop-test';
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.lpush', {
                    key: listKey,
                    value: test
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res).to.be.equal(1);
                    cb(e);
                });
            },
            (cb) => {
                s.request<IBlock, IListPop> ('iw-redis.brpop', {
                    key: listKey
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res.list).to.be.equal(listKey);
                    expect(res.value.some).to.be.equal(test.some);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should be able to push a value onto the right side of a list and provide a block left pop to retrieve the value", (done) => {
        var listKey = prefix + 'rpush-blpop-test';
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.rpush', {
                    key: listKey,
                    value: test
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res).to.be.equal(1);
                    cb(e);
                });
            },
            (cb) => {
                s.request<IBlock, IListPop>('iw-redis.blpop', {
                    key: listKey
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res.list).to.be.equal(listKey);
                    expect(res.value.some).to.be.equal(test.some);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should timeout if blocking pop exceeds the given timeout in seconds", (done) => {
        var listKey = prefix + 'rpush-blpop-test-timeout';
        async.waterfall([
            (cb) => {
                s.request<IBlock, IListPop>('iw-redis.blpop', {
                    key: listKey,
                    timeoutInSeconds: 1
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res.list).to.be.null;
                    expect(res.value).to.be.null;
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should return the first value added to any list if key is an array", (done) => {
        var listKeyPrefix = prefix + 'multi-list-pop-test|';
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.rpush', {
                    key: listKeyPrefix + '1',
                    value: test
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res).to.be.equal(1);
                    cb(e);
                });
            },
            (cb) => {
                s.request<IBlock, IListPop>('iw-redis.blpop', {
                    key: [ listKeyPrefix + '1', listKeyPrefix + '2' ]
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res.list).to.be.equal(listKeyPrefix + '1');
                    expect(res.value.some).to.be.equal(test.some);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should return the first value added to any list if key is a csv", (done) => {
        var listKeyPrefix = prefix + 'multi-list-pop-test|';
        async.waterfall([
            (cb) => {
                s.request<ISet, number>('iw-redis.rpush', {
                    key: listKeyPrefix + '1',
                    value: test
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res).to.be.equal(1);
                    cb(e);
                });
            },
            (cb) => {
                s.request<IBlock, IListPop>('iw-redis.blpop', {
                    key: [ listKeyPrefix + '1', listKeyPrefix + '2' ].join(',')
                }, (e, res) => {
                    expect(e).to.be.null;
                    expect(res.list).to.be.equal(listKeyPrefix + '1');
                    expect(res.value.some).to.be.equal(test.some);
                    cb(e);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should inform the 'message-[channel name]' event when a subscribed channel receives a publish message", (done) => {
        var channel = prefix + 'test-channel';
        s.info<ITest>('iw-redis.message-' + channel, (data) => {
            expect(data.some).to.be.equal(test.some);
            done();
        });
        s.request<string|string[], string>('iw-redis.subscribe', channel, (e, channelName) => {
            expect(e).to.be.null;
            expect(channelName).to.be.equal(channel);
            var anotherRedisClient = redis.createClient();
            anotherRedisClient.publish(channel, JSON.stringify(test));
        });
    });

    it("should inform the 'message' event when a subscribed channel receives a publish message", (done) => {
        var channel = prefix + 'test-channel';
        s.info<ISubscriptionMessage>('iw-redis.message', (data) => {
            expect(data.channel).to.be.equal(channel);
            expect(data.value.some).to.be.equal(test.some);
            done();
        });
        s.request<string|string[], string>('iw-redis.subscribe', channel, (e, channelName) => {
            expect(e).to.be.null;
            expect(channelName).to.be.equal(channel);
            var anotherRedisClient = redis.createClient();
            anotherRedisClient.publish(channel, JSON.stringify(test));
        });
    });

    it("should be able to publish to a channel", (done) => {
        var channel = prefix + 'test-channel';
        async.waterfall([
            (cb) => {
                s.request<string|string[], string>('iw-redis.subscribe', channel, (e, channelName) => {
                    expect(e).to.be.null;
                    expect(channelName).to.be.equal(channel);
                    cb(null);
                });
            },
            (cb) => {
                s.info<ITest>('iw-redis.message-' + channel, (data) => {
                    expect(data.some).to.be.equal(test.some);
                    cb(null);
                }).request<IPublish, string>('iw-redis.publish', {
                    channel: channel,
                    value: test
                }, (e, subscriberCount) => {
                    expect(e).to.be.null;
                    expect(subscriberCount).to.be.equal(1);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            done();
        });
    });

    it("should not inform the 'message-[channel name]' event if unsubscribed", (done) => {
        var channel = prefix + 'test-channel';
        s.info<ITest>('iw-redis.message-' + channel, (data) => {
            throw new Error('event should not have been called once unsubscribed');
        });
        async.waterfall([
            (cb) => {
                s.request<string|string[], string>('iw-redis.subscribe', channel, (e, channelName) => {
                    expect(e).to.be.null;
                    expect(channelName).to.be.equal(channel);
                    cb(null);
                });
            },
            (cb) => {
                s.request<string|string[], string>('iw-redis.unsubscribe', channel, (e, channelName) => {
                    expect(e).to.be.null;
                    expect(channelName).to.be.equal(channel);
                    cb(null);
                });
            }
        ], (e) => {
            expect(e).to.be.null;
            var anotherRedisClient = redis.createClient();
            anotherRedisClient.publish(channel, JSON.stringify(test), () => {
                setTimeout(done, 100);
            });
        });
    });

    afterEach((done) => {
        s.dispose(() => {
            done();
        });
    });
});
