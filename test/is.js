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
const is            = require('../bin/is');

describe('is', () => {

    describe('byte', () => {

        it('is byte', () => {
            expect(is.byte('AAAA')).to.be.true;
        });

        it('not length multiple of 4', () => {
            expect(is.byte('AAA')).to.be.false;
        });

        it('invalid character', () => {
            expect(is.byte('AAA%')).to.be.false;
        });

    });

    describe('binary', () => {

        it('is binary', () => {
            expect(is.binary('00000000')).to.be.true;
        });

        it('not length multiple of 8', () => {
            expect(is.binary('0')).to.be.false;
        });

        it('invalid character', () => {
            expect(is.binary('0000000a')).to.be.false;
        });

    });

    describe('boolean', () => {

        it('is boolean true', () => {
            expect(is.boolean('true')).to.be.true;
        });

        it('is boolean false', () => {
            expect(is.boolean('false')).to.be.true;
        });

        it('other', () => {
            expect(is.boolean('hello')).to.be.false;
        });

    });

    describe('integer', () => {

        it('is integer', () => {
            expect(is.integer('1')).to.be.true;
        });

        it('is decimal', () => {
            expect(is.integer('1.2')).to.be.false;
        });

        it('is not a number', () => {
            expect(is.integer('a')).to.be.false;
        });

    });

    describe('number', () => {

        it('is integer', () => {
            expect(is.number('1')).to.be.true;
        });

        it('is decimal', () => {
            expect(is.number('1.2')).to.be.true;
        });

        it('is not a number', () => {
            expect(is.number('a')).to.be.false;
        });

    });

});