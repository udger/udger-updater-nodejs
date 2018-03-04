const tap = require('tap');

let options = {
    subscriptionKey:'invalidKey-test-udger-updater-nodejs',
    currentDatabase:__dirname+'/db/udgerdb_v3_test.dat'
};

tap.test(
    'invalid key should return bad api key',
    (t) => {
        const udgerUpdater = require('../')(options);
        udgerUpdater.downloadNow((err) => {
            t.equal(err.message.match(/bad api key/)[0], 'bad api key');
            t.end();
        });
    }
);
