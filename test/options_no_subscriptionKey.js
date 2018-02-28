const tap = require('tap');

let options = {};

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


