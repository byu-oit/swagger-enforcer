/**
 *  @license
 *    Copyright 2016 Brigham Young University
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
const applyTemplate     = require('../bin/apply-template');
const expect            = require('chai').expect;

describe('apply template', () => {

    it('can apply string template', () => {
        const schema = {
            type: 'string',
            'x-template': '{hello}'
        };
        const result = applyTemplate(schema, {}, { hello: 'Hi' });
        expect(result).to.equal('Hi');
    });

    it('can apply integer template', () => {
        const schema = {
            type: 'integer',
            'x-template': '{hello}'
        };
        const result = applyTemplate(schema, null, { hello: 15 });
        expect(result).to.equal(15);
    });

    it('can apply number template', () => {
        const schema = {
            type: 'number',
            'x-template': '{hello}'
        };
        const result = applyTemplate(schema, {}, { hello: 1.5 });
        expect(result).to.equal(1.5);
    });

    it('can apply boolean template', () => {
        const schema = {
            type: 'boolean',
            'x-template': '{hello}'
        };
        const result = applyTemplate(schema, {}, { hello: true });
        expect(result).to.equal(true);
    });

    it('can apply byte template', () => {
        const schema = {
            type: 'string',
            format: 'byte',
            'x-template': '{x}'
        };
        const result = applyTemplate(schema, {}, { x: 'Hello' });
        expect(result).to.equal('SGVsbG8=');
    });

    // TODO: figure out how to evaluate as number
    /*it.only('can apply binary template', () => {
        const schema = {
            type: 'string',
            format: 'binary',
            'x-template': '{x}'
        };
        const result = applyTemplate(schema, {}, { x: 1 });
        expect(result).to.equal('00000001');
    });*/

    // TODO: figure out how to evaluate as date
    /*it('can apply date template', () => {
        const schema = {
            type: 'string',
            format: 'date',
            'x-template': '{x}'
        };
        const result = applyTemplate(schema, {}, { x: new Date('2000-01-01T00:00:00.000Z') });
        expect(result).to.equal('2000-01-01T00:00:00.000Z');
    });*/


    it('will not apply x-template without param', () => {
        const schema = {
            type: 'integer',
            'x-template': '{hello}'
        };
        const result = applyTemplate(schema, {}, {});
        expect(result).to.equal(undefined);
    });

    it('will apply default', () => {
        const schema = {
            type: 'integer',
            default: 5
        };
        const result = applyTemplate(schema, {}, {});
        expect(result).to.equal(5);
    });

    it('will use custom replacement', () => {
        const schema = {
            type: 'string',
            'x-template': 'Hello'
        };
        const result = applyTemplate(schema, {}, {}, {
            replacement: function(value, param) {
                return 'abc';
            }
        });
        expect(result).to.equal('abc');
    });

});