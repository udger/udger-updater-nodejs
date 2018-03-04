const tap = require('tap');

let options = {
    subscriptionKey:'invalidKey-test-udger-updater-nodejs',
    currentDatabase:__dirname+'/db/udgerdb_v3_test.dat.no.exist'
};

tap.test(
    'no options should thrown an error',
    (t) => {

        t.throw(
            ()=> {
                const udgerUpdater = require('../')(options);
            },
            {}
        );
        t.end();
    }
);
