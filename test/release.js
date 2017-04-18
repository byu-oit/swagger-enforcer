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
const expect            = require('chai').expect;
const enforcer          = require('../bin/enforcer');
const release           = require('../bin/release');
const schemas           = require('../bin/schemas');

describe('release', () => {
    const options = schemas.enforcer.normalize({});

    describe('array', () => {
        let obj;
        const schema = {
            type: 'array',
            items: { type: 'number' }
        };

        beforeEach(() => obj = enforcer(options).enforce(schema));

        it('enforced', () => {
            expect(() => obj.push('a')).to.throw(Error);
        });

        it('released', () => {
            obj.push(1);
            obj.push(2);
            const r = release(obj);
            expect(() => r.push('a')).not.to.throw(Error);
        });

    });

    describe('object', () => {
        let obj;
        const schema = {
            type: 'object',
            properties: {
                num: { type: 'number' }
            }
        };

        beforeEach(() => obj = enforcer(options).enforce(schema));

        it('enforced', () => {
            expect(() => obj.num = 'a').to.throw(Error);
        });

        it('released', () => {
            const r = release(obj);
            expect(() => r.num = 'a').not.to.throw(Error);
        });

    });

    describe('nested object', () => {
        let obj;
        const schema = {
            type: 'object',
            properties: {
                ar: {
                    type: 'array',
                    items: { type: 'number' }
                },
                obj: {
                    type: 'object',
                    properties: {
                        num: { type: 'number' }
                    }
                }
            }
        };

        beforeEach(() => obj = enforcer(options).enforce(schema, { ar: [], obj: {} }));

        it('enforced', () => {
            expect(() => obj.ar.push('a')).to.throw(Error);
            expect(() => obj.obj.num = 'a').to.throw(Error);
        });

        it('released', () => {
            const r = release(obj);
            expect(() => r.ar.push('a')).not.to.throw(Error);
            expect(() => r.obj.num = 'a').not.to.throw(Error);
        });

    });

});