const tap = require('tap');

let options = null;

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


