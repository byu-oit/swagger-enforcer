/**
 *  @license
 *    Copyright 2017 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const bodyParser    = require('body-parser');
const busboy        = require('connect-busboy')();
const express       = require('express');
const formidable    = require('formidable');
const fs            = require('fs');
const multiparty    = require('multiparty');
const request       = require('request-promise-native');
const schema        = require('./swagger.json');
const Swagger       = require('../index');


const app = express();
const swagger = new Swagger(schema);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

// demonstrate that connect-busboy, formidable, and multiparty all work
app.use((req, res, next) => {
    switch (req.query.middleware) {
        case 'busboy':
            busboy(req, res, next);
            break;
        case 'formidable':
            const form1 = new formidable.IncomingForm();
            form1.parse(req, (err, fields, files) => {
                if (err) return next(err);
            });
            break;
        case 'multiparty':
            const form2 = new multiparty.Form();
            form2.parse(req, (err, fields, files) => {
                if (err) return next(err);
            });
            break;
    }
});

app.use((req, res, next) => {
    next();
});

app.use(swagger.middleware());

const listener = app.listen(function(err) {
    if (err) {
        console.error(err.stack);
    } else {
        const domain= 'http://localhost:' + listener.address().port;
        const catFile = fs.readFileSync(__dirname + '/cat.jpg').toString('base64');

        const config = {
            url: domain + '/cat/1',
            headers: { 'content-type': 'multipart/form-data' },
            formData: {
                name: 'Mittens',
                file: fs.createReadStream(__dirname + '/cat.jpg')
            }
        };

        const formidable = request(Object.assign({}, config, { query: {}}))

    }
});

