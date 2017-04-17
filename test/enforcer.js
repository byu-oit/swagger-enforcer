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
const canProxy      = require('../bin/can-proxy');
const expect        = require('chai').expect;
const enforcer      = require('../bin/enforcer');
const schemas       = require('../bin/schemas');

describe('enforcer', () => {

    describe('enforce', () => {

        if (!canProxy) {

            it('does not support active enforcement', () => {
                const options = schemas.enforcer.normalize({});
                expect(code(() => enforcer(options).enforce({}, {}))).to.equal('ESRPROXY');
            });

        } else {

            describe('array', () => {
                const options = schemas.enforcer.normalize({});
                const schema = {
                    type: 'array',
                    items: {
                        type: 'number'
                    }
                };

                it('no initial value', () => {
                    const schema = { type: 'array' };
                    expect(() => enforcer(options).enforce(schema)).not.to.throw(Error);
                });

                describe('schemaless items', () => {
                    const schema = { type: 'array' };

                    it('mixed', () => {
                        expect(() => enforcer(options).enforce(schema, ['a', true, 1, null])).not.to.throw(Error);
                    });

                });

                describe('initialize to value', () => {

                    it('valid', () => {
                        expect(() => enforcer(options).enforce(schema, [1, 2, 3])).not.to.throw(Error);
                    });

                    it('not an array', () => {
                        expect(code(() => enforcer(options).enforce(schema, {}))).to.equal('ESRTYPE');
                    });

                    it('invalid items', () => {
                        const c = code(() => enforcer(options).enforce(schema, ['1']));
                        expect(c).to.equal('ESRTYPE');
                    });

                });

                it('set property', () => {
                    const ar = enforcer(options).enforce(schema, []);
                    ar.foo = 'bar';
                    expect(ar.foo).to.equal('bar');
                });

                describe('set by index', () => {

                    it('valid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar[0] = 1;
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar[0] = '1')).to.equal('ESRTYPE');
                    });

                    it('valid past current length', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar[1] = 1;
                        expect(ar[1]).to.equal(1);
                    });

                    it('invalid past max length', () => {
                        const schema = { type: 'array', maxItems: 1 };
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar[1] = 1)).to.equal('ESRLEN');
                    });

                    it('schemaless items', () => {
                        const schema = { type: 'array' };
                        const ar = enforcer(options).enforce(schema, []);
                        ar[0] = 1;
                        expect(ar[0]).to.equal(1);
                    });

                });

                describe('concat', () => {

                    it('valid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        const ar2 = ar.concat(1);
                        expect(ar2[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar.concat('1'))).to.equal('ESRTYPE');
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        const ar2 = ar.concat(1);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('copyWithin', () => {

                    it('makes copy within', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        ar.copyWithin(2, 0);
                        expect(ar).to.deep.equal([1, 2, 1, 2]);
                    });

                    it('returns original proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.copyWithin(2, 0);
                        expect(ar).to.equal(ar2);
                    });

                });

                describe('fill', () => {

                    it('fills with value', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        ar.fill(10, 1, 3);
                        expect(ar).to.deep.equal([1, 10, 10, 4]);
                    });

                    it('returns original proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.fill(10, 1, 3);
                        expect(ar).to.equal(ar2);
                    });

                    it('fills without item schema', () => {
                        const schema = { type: 'array' };
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        ar.fill('a', 1, 3);
                        expect(ar).to.deep.equal([1, 'a', 'a', 4]);
                    });

                });

                describe('filter', () => {

                    it('returns filtered', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.filter(v => v % 2 === 0);
                        expect(ar2).to.deep.equal([2, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.filter(v => v % 2 === 0);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('map', () => {

                    it('returns mapped', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.map(v => v * 2);
                        expect(ar2).to.deep.equal([2, 4, 6, 8]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.map(v => v * 2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('pop', () => {
                    const schema = { type: 'array', minItems: 1 };
                    const options = schemas.enforcer.normalize({ enforce: { minItems: true } });

                    it('can pop above min items', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        const x = ar.pop();
                        expect(ar).to.deep.equal([1]);
                        expect(x).to.equal(2);
                    });

                    it('cannot pop at min items', () => {
                        const ar = enforcer(options).enforce(schema, [1]);
                        expect(code(() => ar.pop())).to.equal('ESRLEN');
                    });

                });

                describe('push', () => {

                    it('valid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.push(1);
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar.push('1'))).to.equal('ESRTYPE');
                    });

                    it('returns new length', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(ar.push(1)).to.equal(1);
                    });

                    it('cannot push at max items', () => {
                        const schema = { type: 'array', maxItems: 0 };
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar.push(1))).to.equal('ESRLEN');
                    });

                });

                describe('shift', () => {
                    const schema = { type: 'array', minItems: 1 };
                    const options = schemas.enforcer.normalize({ enforce: { minItems: true } });

                    it('can shift above min items', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        const x = ar.shift();
                        expect(ar).to.deep.equal([2]);
                        expect(x).to.equal(1);
                    });

                    it('cannot shift at min items', () => {
                        const ar = enforcer(options).enforce(schema, [1]);
                        expect(code(() => ar.shift())).to.equal('ESRLEN');
                    });

                });

                describe('slice', () => {

                    it('returns slice', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.slice(2);
                        expect(ar2).to.deep.equal([3, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.slice(2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                });

                describe('splice', () => {

                    it('returns removed values', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.splice(2, 2);
                        expect(ar2).to.deep.equal([3, 4]);
                    });

                    it('returns new proxy', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2, 3, 4]);
                        const ar2 = ar.splice(2, 2);
                        expect(ar2).not.to.equal(ar);
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                    it('valid new values', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        ar.splice(1, 0, 3, 4);
                        expect(ar).to.deep.equal([1, 3, 4, 2]);
                    });

                    it('invalid new values', () => {
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        expect(code(() => ar.splice(1, 0, '3'))).to.equal('ESRTYPE');
                    });

                    it('cannot remove below min items', () => {
                        const schema = { type: 'array', minItems: 1 };
                        const options = schemas.enforcer.normalize({ enforce: { minItems: true } });
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        expect(code(() => ar.splice(1, 2))).to.equal('ESRLEN');
                    });

                    it('cannot add above max items', () => {
                        const schema = { type: 'array', maxItems: 3 };
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        expect(code(() => ar.splice(1, 0, 3, 4))).to.equal('ESRLEN');
                    });

                    it('can add and remove withing min and max items', () => {
                        const schema = { type: 'array', minItems: 2, maxItems: 2 };
                        const options = schemas.enforcer.normalize({ enforce: { minItems: true } });
                        const ar = enforcer(options).enforce(schema, [1, 2]);
                        const x = ar.splice(0, 2, 3, 4);
                        expect(ar).to.deep.equal([3, 4]);
                        expect(x).to.deep.equal([1, 2]);
                    });

                });

                describe('unshift', () => {

                    it('valid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.unshift(1);
                        expect(ar[0]).to.equal(1);
                    });

                    it('invalid', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar.unshift('1'))).to.equal('ESRTYPE');
                    });

                    it('returns new length', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(ar.unshift(1)).to.equal(1);
                    });

                    it('cannot unshift at max items', () => {
                        const schema = { type: 'array', maxItems: 0 };
                        const ar = enforcer(options).enforce(schema, []);
                        expect(code(() => ar.unshift(1))).to.equal('ESRLEN');
                    });

                });

                describe('unique items', () => {
                    const options = schemas.enforcer.normalize({ enforce: { uniqueItems: true } });
                    const schema = {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'number'
                        }
                    };

                    it('init unique', () => {
                        expect(code(() => enforcer(options).enforce(schema, [1, 2, 1]))).to.equal('ESRUNIQ');
                    });

                    it('can add unique', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('cannot add duplicate', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.push(1);
                        expect(() => ar.push(1)).to.throw(Error);
                    });

                    it('can add again a popped item', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.push(1);
                        ar.pop();
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('can add again a shifted item', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.push(1);
                        ar.shift();
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                    it('can add again a removed spliced item', () => {
                        const ar = enforcer(options).enforce(schema, []);
                        ar.push(1);
                        ar.splice(0, 1);
                        expect(() => ar.push(1)).not.to.throw(Error);
                    });

                });

                describe('nested array', () => {
                    const schema = {
                        type: 'array',
                        items: {
                            type: 'array',
                            items: {
                                type: 'number'
                            }
                        }
                    };

                    it('enforces init value', () => {
                        expect(code(() => enforcer(options).enforce(schema, [['a']]))).to.equal('ESRTYPE');
                    });

                    it('enforces push value', () => {
                        const ar = enforcer(options).enforce(schema, [[]]);
                        ar.push([1]);
                        expect(code(() => ar.push(['a']))).to.equal('ESRTYPE');
                    });

                    it('proxies inner init', () => {
                        const ar = enforcer(options).enforce(schema, [[]]);
                        const ar2 = ar[0];
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });

                    it('proxies inner value', () => {
                        const ar = enforcer(options).enforce(schema, [[]]);
                        ar.push([1]);
                        const ar2 = ar[1];
                        expect(ar2.__swaggerResponseType__).to.equal('array');
                    });
                });

            });

            describe('object', () => {
                const options = schemas.enforcer.normalize({});

                it('no initial value', () => {
                    const schema = { type: 'object' };
                    expect(() => enforcer(options).enforce(schema)).not.to.throw(Error);
                });

                it('not a valid object', () => {
                    const schema = { type: 'object' };
                    expect(code(() => enforcer(options).enforce(schema, []))).to.equal('ESRTYPE');
                });

                describe('proxy', () => {

                    it('top level is proxied', () => {
                        const schema = { type: 'object' };
                        const o = enforcer(options).enforce(schema);
                        expect(o.__swaggerResponseType__).to.equal('object');
                    });

                    it('nested is proxied', () => {
                        const schema = {
                            type: 'object',
                            properties: { foo: { type: 'object' } }
                        };
                        const o = enforcer(options).enforce(schema);
                        o.foo = {};
                        expect(o.foo.__swaggerResponseType__).to.equal('object');
                    });

                });

                describe('min and max properties', () => {
                    const options = schemas.enforcer.normalize({ enforce: { maxProperties: true, minProperties: true } });

                    it('can delete above minProperties', () => {
                        const schema = { type: 'object', minProperties: 1 };
                        const o = enforcer(options).enforce(schema, { foo: 1, bar: 2 });
                        expect(() => delete o.bar).not.to.throw(Error);
                    });

                    it('cannot delete below minProperties', () => {
                        const schema = { type: 'object', minProperties: 1 };
                        const o = enforcer(options).enforce(schema, { foo: 1 });
                        expect(code(() => delete o.foo)).to.equal('ESRLEN');
                    });

                    it('cannot add above maxProperties', () => {
                        const schema = { type: 'object', maxProperties: 1 };
                        const o = enforcer(options).enforce(schema, { foo: 1 });
                        expect(code(() => o.bar = 5)).to.equal('ESRLEN');
                    });

                    it('can set at maxProperties', () => {
                        const schema = { type: 'object', maxProperties: 1 };
                        const o = enforcer(options).enforce(schema, { foo: 1 });
                        expect(() => o.foo = 2).not.to.throw(Error);
                        expect(o.foo).to.equal(2);
                    });

                });

                describe('specific vs additional properties', () => {
                    const schema = {
                        type: 'object',
                        properties: { foo: { type: 'string' } },
                        additionalProperties: { type: 'number' }
                    };

                    it('valid specific property', () => {
                        const o = enforcer(options).enforce(schema);
                        expect(() => o.foo = 'abc').not.to.throw(Error);
                    });

                    it('invalid specific property', () => {
                        const o = enforcer(options).enforce(schema);
                        expect(code(() => o.foo = 123)).to.equal('ESRTYPE');
                    });

                    it('valid additional property', () => {
                        const o = enforcer(options).enforce(schema);
                        expect(() => o.bar = 123).not.to.throw(Error);
                    });

                    it('invalid additional property', () => {
                        const o = enforcer(options).enforce(schema);
                        expect(code(() => o.baz = 'abc')).to.equal('ESRTYPE');
                    });

                });

                describe('required properties', () => {
                    const options = schemas.enforcer.normalize({ enforce: { required: true }});

                    it('top level omitted', () => {
                        const schema = { type: 'object', properties: { foo: { required: true } } };
                        expect(code(() => enforcer(options).enforce(schema, {}))).to.equal('ESRREQ');
                    });

                    it('nested top level omitted', () => {
                        const schema = {
                            type: 'object',
                            properties: {
                                foo: {
                                    type: 'object',
                                    properties: {
                                        bar: {
                                            required: true
                                        }
                                    }
                                }
                            }
                        };

                        const o = enforcer(options).enforce(schema);
                        expect(code(() => o.foo = {})).to.equal('ESRREQ');
                    });

                    it('additionalProperties', () => {
                        const schema = {
                            type: 'object',
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    id: {
                                        required: true
                                    }
                                }
                            }
                        };

                        const o = enforcer(options).enforce(schema);
                        o.abc = { id: 'abc' };
                        expect(code(() => o.def = {})).to.equal('ESRREQ');
                    });

                    it('cannot delete required property', () => {
                        const schema = { type: 'object', properties: { foo: { required: true } } };
                        const o = enforcer(options).enforce(schema, { foo: 1 });
                        expect(code(() => delete o.foo)).to.equal('ESRREQ');
                    });

                    it('set all of', () => {
                        const schema = { allOf: [
                            { properties: { foo: { required: true } } },
                            { properties: { foo: { type: 'string' } } }
                        ]};
                        const o = enforcer(options).enforce(schema, { foo: 'a' });
                        o.foo = 'b';
                    });

                    it('delete all of', () => {
                        const schema = { allOf: [
                            { properties: { foo: { required: true } } },
                            { properties: { foo: { type: 'string' } } }
                        ]};
                        const o = enforcer(options).enforce(schema, { foo: 'a' });
                        expect(code(() => delete o.foo)).to.equal('ESRREQ');
                    });

                });

                describe('schemaless', () => {
                    const schema = { type: 'object' };

                    it('array', () => {
                        expect(() => enforcer(options).enforce(schema, { a: [] })).not.to.throw(Error);
                    });

                    it('string', () => {
                        expect(() => enforcer(options).enforce(schema, { a: 'hello' })).not.to.throw(Error);
                    });

                    it('boolean', () => {
                        expect(() => enforcer(options).enforce(schema, { a: true })).not.to.throw(Error);
                    });

                    it('non serializable value', () => {
                        expect(code(() => enforcer(options).enforce(schema, { a: function() {} }))).to.equal('ESRTYPE');
                    });

                });

                describe('property has defined type', () => {

                    it('string valid', () => {
                        const schema = { type: 'object', properties: { foo: { type: 'string' } } };
                        expect(() => enforcer(options).enforce(schema, { foo: 'hello' })).not.to.throw(Error);
                    });

                    it('string invalid', () => {
                        const schema = { type: 'object', properties: { foo: { type: 'string' } } };
                        expect(code(() => enforcer(options).enforce(schema, { foo: 1 }))).to.equal('ESRTYPE');
                    });

                    it('unknown property', () => {
                        const schema = { type: 'object', properties: {} };
                        expect(code(() => enforcer(options).enforce(schema, { foo: 'hello' }))).to.equal('ESRNPER');
                    });

                    it('additional property valid', () => {
                        const schema = { type: 'object', additionalProperties: { type: 'string' } };
                        expect(() => enforcer(options).enforce(schema, { foo: 'hello' })).not.to.throw(Error);
                    });

                    it('additional property invalid', () => {
                        const schema = { type: 'object', additionalProperties: { type: 'string' } };
                        expect(code(() => enforcer(options).enforce(schema, { foo: 1 }))).to.equal('ESRTYPE');
                    });

                });

            });

            describe('primitives', () => {
                const options = schemas.enforcer.normalize({});

                it('no initial value', () => {
                    expect(code(() => enforcer(options).enforce({}))).to.equal('ESRTYPE');
                });

            });

            describe('number', () => {
                const options = schemas.enforcer.normalize({});

                it('valid below maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(() => enforcer(options).enforce(schema, 5)).not.to.throw(Error);
                });

                it('valid at maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(() => enforcer(options).enforce(schema, 10)).not.to.throw(Error);
                });

                it('invalid above maximum', () => {
                    const schema = { type: 'number', maximum: 10 };
                    expect(code(() => enforcer(options).enforce(schema, 15))).to.equal('ESRNMAX');
                });

                it('invalid above exclusive maximum', () => {
                    const schema = { type: 'number', maximum: 10, exclusiveMaximum: true };
                    expect(code(() => enforcer(options).enforce(schema, 15))).to.equal('ESRNMAX');
                });

                it('invalid at exclusive maximum', () => {
                    const schema = { type: 'number', maximum: 10, exclusiveMaximum: true };
                    expect(code(() => enforcer(options).enforce(schema, 10))).to.equal('ESRNMAX');
                });

                it('valid above minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(() => enforcer(options).enforce(schema, 15)).not.to.throw(Error);
                });

                it('valid at minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(() => enforcer(options).enforce(schema, 10)).not.to.throw(Error);
                });

                it('invalid below minimum', () => {
                    const schema = { type: 'number', minimum: 10 };
                    expect(code(() => enforcer(options).enforce(schema, 5))).to.equal('ESRNMIN');
                });

                it('invalid below exclusive minimum', () => {
                    const schema = { type: 'number', minimum: 10, exclusiveMinimum: true };
                    expect(code(() => enforcer(options).enforce(schema, 5))).to.equal('ESRNMIN');
                });

                it('invalid at exclusive minimum', () => {
                    const schema = { type: 'number', minimum: 10, exclusiveMinimum: true };
                    expect(code(() => enforcer(options).enforce(schema, 10))).to.equal('ESRNMIN');
                });

                it('valid multiple of', () => {
                    const schema = { type: 'number', multipleOf: 10 };
                    expect(() => enforcer(options).enforce(schema, 20)).not.to.throw(Error);
                });

                it('invalid multiple of', () => {
                    const schema = { type: 'number', multipleOf: 10 };
                    expect(code(() => enforcer(options).enforce(schema, 5))).to.equal('ESRNMULT');
                });

                it('valid integer', () => {
                    const schema = { type: 'integer' };
                    expect(() => enforcer(options).enforce(schema, 5)).not.to.throw(Error);
                });

                it('invalid integer', () => {
                    const schema = { type: 'integer' };
                    expect(code(() => enforcer(options).enforce(schema, 5.5))).to.equal('ESRNINT');
                });

            });

            describe('string', () => {
                const options = schemas.enforcer.normalize({});

                it('valid max length', () => {
                    const schema = { type: 'string', maxLength: 3 };
                    expect(() => enforcer(options).enforce(schema, 'abc')).not.to.throw(Error);
                });

                it('invalid max length', () => {
                    const schema = { type: 'string', maxLength: 3 };
                    expect(code(() => enforcer(options).enforce(schema, 'abcd'))).to.equal('ESRSMAX');
                });

                it('valid min length', () => {
                    const schema = { type: 'string', minLength: 3 };
                    expect(() => enforcer(options).enforce(schema, 'abc')).not.to.throw(Error);
                });

                it('invalid min length', () => {
                    const schema = { type: 'string', minLength: 3 };
                    expect(code(() => enforcer(options).enforce(schema, 'a'))).to.equal('ESRSMIN');
                });

                it('valid pattern', () => {
                    const schema = { type: 'string', pattern: '^[abc]$' };
                    expect(() => enforcer(options).enforce(schema, 'a')).not.to.throw(Error);
                });

                it('invalid pattern', () => {
                    const schema = { type: 'string', pattern: '^[abc]$' };
                    expect(code(() => enforcer(options).enforce(schema, 'd'))).to.equal('ESRSPAT');
                });

            });

            describe('enum', () => {
                const options = schemas.enforcer.normalize({});
                const schema = { enum: ['a']};

                it('found', () => {
                    expect(() => enforcer(options).enforce(schema, 'a')).not.to.throw(Error);
                });

                it('not found', () => {
                    expect(code(() => enforcer(options).enforce(schema, 'b'))).to.equal('ESRENUM');
                });

            });

        }

    });

    describe('validate', () => {



    });

});

function code(callback) {
    try {
        callback();
    } catch (e) {
        return e.code;
    }
    throw Error('Expected an error to be thrown but was not.');
}