const tap = require('tap');
const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp');

let options = {
    subscriptionKey:'UDGER_KEY',
    currentDatabase:'./udgerdb_v3.dat',
    nextDatabase:tmp.tmpNameSync()
};

console.log("tmp file: %s", options.nextDatabase);

const udgerUpdater = require('../')(options);

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
    console.log('downloading ... %s', percent);
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

udgerUpdater.on('diffDone', (report) => {
    console.log('diff done');

    // warning, at this point, every process using current database
    // must close connection. New database can not be copied if used.
    fs.copy(options.nextDatabase, options.currentDatabase, err => {
        if (err) return console.error(err);
        console.log('%s has been updated', options.currentDatabase);
    });

    fs.outputFileSync('./report.html', report.htmlReport);
});

udgerUpdater.checkForUpdate();
