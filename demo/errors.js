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
const Swagger = require('../index');

const swagger = new Swagger({ openapi: '3.0.0' });

const schema1 = {
    type: 'number',
    multipleOf: 5,
    minimum: 10
};

const errors1 = swagger.errors(schema1, 8);
console.log('Example 1:\n' + errors1.join('\n') + '\n');



const schema2 = {
    type: 'object',
    additionalProperties: false,
    properties: {
        names: {
            type: 'array',
            items: {
                type: 'string',
                minLength: 1
            }
        },
        date: {
            type: 'string',
            format: 'date-time',
            maximum: '2000-01-01T00:00:00.000Z'
        }
    }
};

const errors2 = swagger.errors(schema2, {
    names: [ 'Bob', 'Jan', '' ],
    date: '2010-01-01T00:00:00.000Z',
    num: 8
});
console.log('Example 2:\n' + errors2.join('\n') + '\n');