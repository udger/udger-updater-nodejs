# udger-updater-nodejs
[![Build Status](https://travis-ci.org/udger/udger-updater-nodejs.svg?branch=master)](https://travis-ci.org/udger/udger-updater-nodejs)
[![Dependencies](https://david-dm.org/udger/udger-updater-nodejs.svg)](https://david-dm.org/udger/udger-updater-nodejs)

# Udger Updater for NodeJS (data ver. 3)
Like others [udger-updater-win](https://github.com/udger/udger-updater-win) and [udger-updater-linux](https://github.com/udger/udger-updater-linux),
this module handle udger sqlite database update. Differences with other updaters:

* 100% nodejs
* Dump differences between database versions (all tables)

## Requirements
 - nodejs >= 8.9.0
 - datafile v3 (udgerdb_v3.dat) from https://data.udger.com/
 - a valid subscription key

## Install
    npm install udger-updater-nodejs


## Usage example

```
const fs = require('fs-extra');

let options = {
    subscriptionKey:process.env.UDGER_KEY||'YOUR_SUBSCRIPTION_KEY_HERE',
    currentDatabase:'./udgerdb_v3.dat',

    // you can force a temporary filename,
    // if not set, it will use os tmpdir with a random filename
    // nextDatabase:'./tmpFile.dat'
};

console.log("tmp file: %s", options.nextDatabase);

const udgerUpdater = require('../')(options);

udgerUpdater.on('error', (err) => {
    console.log('an error occured');
    console.log(err);
})

udgerUpdater.on('needUpdate', (needUpdate, versions) => {
    if (needUpdate) {
        console.log('udger database should be updated');
        console.log(JSON.stringify(versions, null, 4));
        return udgerUpdater.downloadNow();
    }

    console.log('udger database already up to date');
    console.log(JSON.stringify(versions, null, 4));

});

udgerUpdater.on('downloading', (percent) => {
    if (percent % 33 === 0 || !percent || percent === 100) {
        console.log('downloading udger database ... %s', percent+'%');
    }
});

udgerUpdater.on('downloaded', () => {
    console.log('downloaded');

    udgerUpdater.makeDiff({
        itemsDisplayedMax:1000,
        htmlReport:true
    });

});

udgerUpdater.on('diffing', (sqliteTableName) => {
    console.log('diffing %s', sqliteTableName);
});

udgerUpdater.on('diffDone', () => {
    console.log('diff done');

    // warning, at this point, every process using current database
    // must close connection. New database can not be copied if used.
    fs.copy(options.nextDatabase, options.currentDatabase, err => {
        if (err) return console.error(err);
        console.log('%s has been updated', options.currentDatabase);
    })
});

udgerUpdater.checkForUpdate();
```

## HTML Report sample

![Alt text](/example/report.png?raw=true)


## Troubleshoot
    You can use env var "DEBUG" to see debug messages.

win32
```
cd example
set DEBUG=*
node update.js
```

linux
```
cd example
DEBUG=* node update.js
```

## Running tests
    npm test


## Author
- The Udger.com Team (info@udger.com)


## old v2 format
This module does not support v2 format

