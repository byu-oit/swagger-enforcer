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
const expect        = require('chai').expect;
const PreppedSchema = require('../bin/prepped-schema');
const schema        = require('../bin/schemas').enforcer;

describe('prepped-schema', () => {

    it('prepped schema as schema', () => {
        const o = schema.normalize({});
        const x = new PreppedSchema({}, o);
        expect(new PreppedSchema(x, o)).to.equal(x);
    });

    it('invalid schema throws error', () => {
        const o = schema.normalize({});
        expect(() => new PreppedSchema(null, o)).to.throw(Error);
    });

    it('invalid options throws error', () => {
        expect(() => new PreppedSchema({}, null)).to.throw(Error);
    });

    it('array items prepped', () => {
        const o = schema.normalize({});
        const s = {
            items: {
                type: 'string'
            }
        };
        const x = new PreppedSchema(s, o);
        expect(x.items).to.be.instanceof(PreppedSchema);
    });

    it('object all of', () => {
        const o = schema.normalize({});
        const s = {
            allOf: [{
                type: 'string'
            }]
        };
        const x = new PreppedSchema(s, o);
        expect(x.allOf).to.deep.equal(s.allOf);
    });

});