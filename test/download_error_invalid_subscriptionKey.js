const tap = require('tap');

let options = {
    subscriptionKey:'invalidKey-test-udger-updater-nodejs',
    currentDatabase:__dirname+'/db/udgerdb_v3_test.dat',
    nextDatabase:'./tmp.dat'
};

tap.test(
    'invalid key should return 404',
    (t) => {
        const udgerUpdater = require('../')(options);
        udgerUpdater.downloadNow((err) => {
            t.equal(err.message.match(/404/)[0], '404');
            t.end();
        });
    }
);
