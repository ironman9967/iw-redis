///<reference path='../../typings/main.d.ts' />

import ironworks = require('ironworks');

import IWorkerChildOpts = ironworks.options.IWorkerChildOpts;

interface IRedisWorkerOpts extends IWorkerChildOpts {}

export = IRedisWorkerOpts;
