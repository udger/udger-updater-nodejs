const tap = require('tap');
const path = require('path');
const fs = require('fs-extra');

let options = {
    subscriptionKey:process.env.UDGER_KEY||'MY_KEY',
    currentDatabase:'./udgerdb_v3.dat',

    // you can force a temporary file.
    // if not set, it will use os tmpdir with a random filename
    // nextDatabase:'./tmpFile.dat'
};

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

udgerUpdater.on('diffDone', (report) => {
    console.log('diff done');

    // warning, at this point, every process using current database
    // must close connection. New database can not be copied if used.

    /*
    fs.copy(options.nextDatabase, options.currentDatabase, err => {
        if (err) return console.error(err);
        console.log('%s has been updated', options.currentDatabase);
    });
    */

    fs.outputFileSync('./report.html', report.htmlReport);
});

udgerUpdater.checkForUpdate();
