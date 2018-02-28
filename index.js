const Database = require('better-sqlite3');
const debug = require('debug')('udger-updater-nodejs');
const fs = require('fs-extra');
const path = require('path');
const merge = require('merge-deep');
const request = require('request');
const moment = require('moment');
const EventEmitter = require('events');

const REPORT_ITEM_DISPLAYED_MAX = 10;

/** Class exposing udger updater methods */
class UdgerUpdater extends EventEmitter {

    constructor(options) {

        super();

        let defaultOptions = {
            subscriptionKey:null,
            currentDatabase:null,
            baseUrl:'http://data.udger.com/',
            remoteFilename:'udgerdb_v3.dat'
        };

        if (!options) {
            throw new Error('no options given');
            return;
        }

        if (!options.subscriptionKey) {
            throw new Error('subscriptionKey option is mandatory');
            return;
        }

        if (!options.currentDatabase) {
            throw new Error('currentDatabase option is mandatory');
            return;
        }

        if (!options.nextDatabase) {
            throw new Error('nextDatabase option is mandatory');
            return;
        }

        this.options = merge(defaultOptions, options);

        this.dbCurrent = new Database(options.currentDatabase, {readonly: true, fileMustExist: true});

        this.url = this.options.baseUrl
            + this.options.subscriptionKey + '/'
            + this.options.remoteFilename;

        this.urlVersion = this.options.baseUrl
            + this.options.subscriptionKey + '/version';

        this.versionCurrent = this.dbCurrent.prepare("SELECT * FROM udger_db_info").get();
        this.versionRemote = null;

    }

    checkForUpdate(callback) {

        debug('checkForUpdate', 'request', this.urlVersion);

        request(this.urlVersion, (err, res, body) => {

            if (err) {
                callback(err);
                return;
            }

            this.versionRemote = body.trim();

            debug('checkForUpdate', 'remote version:', this.versionRemote);
            debug('checkForUpdate', 'current version:', this.versionCurrent.version);

            this.emit('needUpdate', this.versionRemote != this.versionCurrent.version, {
                version:{
                    current:this.versionCurrent.version,
                    available:this.versionRemote
                }
            });

            if (this.versionRemote != this.versionCurrent.version) {
                callback && callback(null, true);
                return;
            }

            callback && callback(null, false);
        });
    }

    download(callback) {
        this.checkForUpdate((err, goForUpdate)=> {
            if (!goForUpdate) {
                callback && callback(null, goForUpdate);
                return;
            }
            this.download(callback);
        })
    }

    downloadNow(callback) {

        if (fs.pathExistsSync(this.options.nextDatabase)) {
            throw new Error(this.options.nextDatabase + ' already exist on the disk');
            return;
        }

        let received = 0;
        let contentLength;
        let previousPercent='';
        let currentPercent;
        let writeStream;

        debug("downloadNow", "downloading", this.url);

        let r = request(this.url);

        r.pause();

        r.on('response', (resp) => {

            if (resp.statusCode === 200) {

                debug("downloadNow","response OK, piping to", this.options.nextDatabase);
                contentLength = parseInt(resp.headers['content-length']);
                writeStream = fs.createWriteStream(this.options.nextDatabase);
                r.pipe(writeStream);
                r.resume();

            } else {

                callback && callback(new Error('unexpected status code ('+resp.statusCode+')'));
                return;

            }
        });

        r.on('data',(chunk) => {
            received+=chunk.length;
            currentPercent = Math.round((received*100)/contentLength)+'%';
            if (previousPercent != currentPercent) {
                previousPercent = currentPercent;
                debug('downloadNow', currentPercent);
                this.emit('downloading', currentPercent);
            }
        });

        r.on('end', () => {
            this.emit('downloaded', true);
            callback && callback(null, true);
        });

    }

    makeDiff(opts, callback) {

        if (typeof opts === 'function') {
            callback = opts;
            opts = {
                itemsDisplayedMax:REPORT_ITEM_DISPLAYED_MAX
            }
        }

        debug("makeDiff");

        this.dbNext = new Database(this.options.nextDatabase, {readonly: true, fileMustExist: true});

        this.versionNext = this.dbNext.prepare("SELECT * FROM udger_db_info").get();

        let dbs = [
            'udger_client_class',
            'udger_client_list',
            //'udger_client_os_relation',
            'udger_client_regex',
            'udger_client_regex_words',
            'udger_crawler_class',
            'udger_crawler_list',
            'udger_datacenter_list',
            'udger_datacenter_range',
            'udger_datacenter_range6',
            'udger_deviceclass_list',
            'udger_deviceclass_regex',
            'udger_deviceclass_regex_words',
            'udger_devicename_brand',
            'udger_devicename_list',
            'udger_devicename_regex',
            'udger_fragment_regex',
            'udger_ip_class',
            'udger_ip_list',
            'udger_os_list',
            'udger_os_regex',
            'udger_os_regex_words'
        ];

        let specialIndex = {
            'udger_devicename_list':'code',
            'udger_ip_list':'ip',
            'udger_datacenter_range':'datacenter_id',
            'udger_datacenter_range6':'datacenter_id',
            'udger_client_regex':'regstring',
            'udger_deviceclass_regex':'regstring',
            'udger_os_regex':'os_id'
        };

        let reportField = {
            'udger_client_class':               ['client_classification'],
            'udger_client_list':                ['name'],
            'udger_client_regex':               ['regstring'],
            'udger_client_regex_words':         ['word'],
            'udger_crawler_class':              ['crawler_classification'],
            'udger_crawler_list':               ['ua_string'],
            'udger_datacenter_list':            ['name'],
            'udger_datacenter_range':           ['ip_from','ip_to'],
            'udger_datacenter_range6':          ['ip_from','ip_to'],
            'udger_deviceclass_list':           ['name'],
            'udger_deviceclass_regex':          ['regstring'],
            'udger_deviceclass_regex_words':    ['word'],
            'udger_devicename_brand':           ['brand_code'],
            'udger_devicename_list':            ['marketname'],
            'udger_devicename_regex':           ['regstring'],
            'udger_fragment_regex':             ['regstring1'],
            'udger_ip_class':                   ['ip_classification'],
            'udger_ip_list':                    ['ip'],
            'udger_os_list':                    ['name'],
            'udger_os_regex':                   ['regstring'],
            'udger_os_regex_words':             ['word']
        }

        let specialFields = {
            //'udger_ip_list':'ip'
        };

        let countCurrent = {};
        let countNext = {};
        let countDiff = {};

        let itemsStats = {};

        let qCurrent;
        let qNext;
        let idx;
        let req;

        dbs.forEach((tb) => {
            countCurrent[tb] = this.dbCurrent.prepare("SELECT count(*) FROM "+tb).get()['count(*)'];
        });

        dbs.forEach((tb) => {
            countNext[tb] = this.dbNext.prepare("SELECT count(*) FROM "+tb).get()['count(*)'];
            itemsStats[tb] = {
                added:{
                    count:0,
                    list:[]
                },
                removed:{
                    count:0,
                    list:[]
                }
            }
        });

        dbs.forEach((tb) => {
            if (countCurrent[tb] != countNext[tb]) {
                countDiff[tb] = {
                    current:countCurrent[tb],
                    next:countNext[tb],
                    diff:countNext[tb]-countCurrent[tb]
                };
            }
        });

        function listAddLimit(list, tb, rec) {
            if (list.length>opts.itemsDisplayedMax) return;
            if (!reportField[tb]) return;
            let strA = [];
            reportField[tb].forEach((f) => {
                strA.push(rec[f]);
            });
            list.push(strA.join(','));
        }

        for (let tb in countDiff) {

            this.emit('diffing', tb);

            idx = specialIndex[tb] || 'id';

            // what has been removed ?

            req = "SELECT * FROM "+tb;

            debug("makeDiff", req);

            qCurrent = this.dbCurrent.prepare(req);

            for (let r of qCurrent.iterate()) {
                //console.log('check removed', tb, idx, r[idx], r);
                qNext = this.dbNext.prepare("SELECT * FROM "+tb+" WHERE "+idx+"=?").get(r[idx]);
                if (!qNext) {
                    itemsStats[tb].removed.count+=1;
                    listAddLimit(itemsStats[tb].removed.list, tb, r);
                }
            }

            // what has been added ?

            req = "SELECT * FROM "+tb;

            qNext = this.dbNext.prepare(req);

            for (let r of qNext.iterate()) {
                //console.log('check added', tb, idx, r[idx]);
                qCurrent = this.dbCurrent.prepare("SELECT * FROM "+tb+" WHERE "+idx+"=?").get(r[idx]);
                if (!qCurrent) {
                    itemsStats[tb].added.count+=1;
                    listAddLimit(itemsStats[tb].added.list, tb, r);
                }
            }

        }

        this.dbNext.close();
        this.dbCurrent.close();

        this.emit('diffDone');

        //console.log('current version:',this.versionCurrent);
        //console.log('next version:',this.versionNext);
        //console.log(JSON.stringify(itemsStats,null,4));

        let report = {
            versions:{
                current:this.versionCurrent,
                next:this.versionNext
            },
            items:itemsStats
        };

        if (opts.htmlReport) {

            function ucwords(str) {
                return (str + '').replace(/^(.)|\s+(.)/g, function ($1) {return $1.toUpperCase()});
            }

            let html = '';
            html+='<style type="text/css">\n';
            html+='* {font-family:consolas}\n';
            html+='table {background-color:#C0C0C0;border:0px;}\n';
            html+='tr {border:1px solid #101010;}\n';
            html+='.title {background-color:gray;font-size:20px;font-weight:bold;padding:5px;}\n';
            html+='.added {background-color:darkgreen;font-size:16px;font-weight:bold;padding:5px;color:white;}\n';
            html+='.removed {background-color:darkred;font-size:16px;font-weight:bold;padding:5px;color:white;}\n';
            html+='.content {padding:10px;}\n';
            html+='</style>\n';

            html+='<h1>Udger Database Update Report</h1>\n';

            html+='<table width="100%" cellpadding="2" cellspacing="0">\n';
            html+='<tr><td colspan="3" width="100%" class="title">Versions</td></tr>\n';
            html+='<tr><td width="170">&nbsp;</td><td width="300"><b>Date</b></td><td width="300"><b>Version</b></td></tr>\n';
            html+='<tr><td>N</td><td>'+moment.unix(report.versions.current.lastupdate).utc().toString()+'</td><td>'+report.versions.current.version+'</td></tr>\n';
            html+='<tr><td>N+1</td><td>'+moment.unix(report.versions.next.lastupdate).utc().toString()+'</td><td>'+report.versions.next.version+'</td></tr>\n';
            html+='</table><br/>\n';

            for (let k in report.items) {
                let t = ucwords(k.replace(/\_/g,' '));
                html+='<table width="100%" cellpadding="2" cellspacing="0">\n';
                if (report.items[k].removed.count || report.items[k].added.count) {
                    let delta = report.items[k].removed.count+report.items[k].added.count;
                    html+='<tr><td colspan="2" width="100%" class="title">'+t+' ('+delta+' changes) </td></tr>\n';
                    html+='<tr>';
                    html+='<td width="50%" class="removed">Removed ('+report.items[k].removed.count+')</td>';
                    html+='<td width="50%" class="added">Added ('+report.items[k].added.count+')</td>';
                    html+='</tr>\n';
                    html+='<tr valign="top" style="font-size:12px">';
                    html+='<td class="content">'+report.items[k].removed.list.join('<br/>')+'</td>';
                    html+='<td class="content">'+report.items[k].added.list.join('<br/>')+'</td>';
                    html+='</tr>\n';
                } else {
                    html+='<tr><td colspan="2" width="100%" class="title">'+t+' (no change) </td></tr>\n';
                }
                html+='</table><br/>\n';
            }

            report.htmlReport = html;
        }

        callback && callback(null, report);

    }
}

module.exports = function(options) {
    return new (UdgerUpdater)(options);
};
