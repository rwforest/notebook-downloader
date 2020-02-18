#!/usr/bin/env node

const program = require('commander');
const request = require('request');
const url = require('url');
const fs = require('fs');
const path = require('path');
const fileUtil = require('./util/file');
const config = require('./config');

program.version(require('./package.json').version, '-v, --version')
    .usage('[options] <Notebook Path>')
    .option('-d, --domain [domain]', 'Databricks domain name')
    .option('-t, --token [token]', 'Databricks API access token')
    .option('-o, --out-dir [folder]', 'output folder path')
    .parse(process.argv);

const DOMAIN = program.domain || config.domain;
const TOKEN = program.token || config.token;
const OUT_DIR = program.outDir || config.outDir;
const NOTEBOOK_PATH = program.args[0] || config.notebookPath;

function writeFile(content, file) {
    var baseName = fileUtil.getBaseName(file);
    var parentBase = path.basename(path.dirname(file));
    var parentDir = path.join(OUT_DIR, parentBase);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir);
    }
    var filePath = path.join(OUT_DIR, parentBase, baseName);
    console.log(file, ' --> ', filePath, '\n');
    fs.writeFile(filePath, content, function (err) {
        if (err) {
            console.log(err);
            return;
        }
    });
}

function downloadDatabricksFile(filePath) {
    var reqOptions = {
        url: url.resolve(DOMAIN, '/api/2.0/workspace/export'),
        qs: {
            path: filePath,
            direct_download: true,
            format: "SOURCE"
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from('token:' + TOKEN).toString('base64'),
            'Content-Type': 'application/json'
        }
    };

    request(reqOptions, function (error, response, body) {
        if (body) {
            writeFile(body, filePath);
        }
    });
}

function databricksFolderList(folderPath) {

    var reqOptions = {
        url: url.resolve(DOMAIN, '/api/2.0/workspace/list'),
        qs: {
            path: folderPath
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from('token:' + TOKEN).toString('base64'),
            'Content-Type': 'application/json'
        }
    };

    request(reqOptions, function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        }
        if (response.headers['content-type'].indexOf('html') > -1) {
            var message = body.substring(
                body.lastIndexOf("<pre>") + 5,
                body.lastIndexOf("</pre>")
            ).trim();
            console.log(message);
            return;
        }
        try {
            var list = JSON.parse(body).objects;
            if (!list) {
                // console.log(body);
                return;
            }
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.object_type == 'NOTEBOOK') {
                    downloadDatabricksFile(item.path);
                    continue;
                }
                if (item.object_type == 'DIRECTORY') {
                    databricksFolderList(item.path);
                }
            }
        } catch (e) {
            console.log(e);
        }
    });

}

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR);
}
databricksFolderList(NOTEBOOK_PATH);
