# udger-updater-nodejs
[![Build Status](https://travis-ci.org/udger/udger-updater-nodejs.svg?branch=master)](https://travis-ci.org/udger/udger-updater-nodejs)
[![Dependencies](https://david-dm.org/udger/udger-updater-nodejs.svg)](https://david-dm.org/udger/udger-updater-nodejs)

# Udger Updater for NodeJS (data ver. 3)
Like others [udger-updater-win](https://github.com/udger/udger-updater-win) and [udger-updater-linux](https://github.com/udger/udger-updater-linux),
this module handler sqlite database update. Differences with other updaters:

* 100% nodejs
* No need to handle a crontab/windows scheduler for periodic updates, just choose a daily hour
* Dump differences between database versions (all tables)
* (not sure yet) handle sqlite read file lock when using [udger-nodejs](https://github.com/udger/udger-nodejs) module

## Requirements
 - nodejs >= 8.9.0
 - datafile v3 (udgerdb_v3.dat) from https://data.udger.com/
 - a valid subscription key

## Install
    npm install udger-updater-nodejs


## Usage

TODO

## Running tests
    npm test


## Author
- The Udger.com Team (info@udger.com)


## old v2 format
This module does not support v2 format

