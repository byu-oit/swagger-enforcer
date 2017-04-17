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
const same          = require('../bin/same');

describe('same', () => {

    it('same primitives', () => {
        expect(same('a', 'a')).to.be.true;
    });

    it('different primitives', () => {
        expect(same('a', 'b')).to.be.false;
    });

    it('one array, one object', () => {
        const a = ['1', '2', '3'];
        const b = {};
        expect(same(a, b)).to.be.false;
    });

    it('same arrays', () => {
        const a = ['1', '2', '3'];
        const b = ['1', '2', '3'];
        expect(same(a, b)).to.be.true;
    });

    it('different length arrays', () => {
        const a = ['1', '2', '3'];
        const b = ['1', '2'];
        expect(same(a, b)).to.be.false;
    });

    it('different arrays', () => {
        const a = ['1', '2', '3'];
        const b = ['1', '2', 3];
        expect(same(a, b)).to.be.false;
    });

    it('same objects', () => {
        const a = { a: 1, b: 2 };
        const b = { b: 2, a: 1 };
        expect(same(a, b)).to.be.true;
    });

    it('different objects', () => {
        const a = { a: 1, b: 2 };
        const b = { b: 2, a: '1' };
        expect(same(a, b)).to.be.false;
    });

    it('different object property count', () => {
        const a = { a: 1, b: 2 };
        const b = { b: 2 };
        expect(same(a, b)).to.be.false;
    });

    it('one object, one null', () => {
        const a = { a: 1, b: 2 };
        const b = null;
        expect(same(a, b)).to.be.false;
    });

    it('nested same', () => {
        const a = { a: [1, 2, 3], b: { foo: 'bar' } };
        const b = { a: [1, 2, 3], b: { foo: 'bar' } };
        expect(same(a, b)).to.be.true;
    });

    it('nested different', () => {
        const a = { a: [1, 2, 3], b: { foo: 'bar' } };
        const b = { a: [1, 2, 3], b: { foo: 'b' } };
        expect(same(a, b)).to.be.false;
    });

});