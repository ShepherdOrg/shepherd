/**
 * Created by gulli on 03/11/17.
 */
// Based on https://github.com/motdotla/dotenv/blob/master/lib/main.js
// Modified to add parsed values to a specified map.
// Pull request has been created to support requirements of this project. May revise and use lib later.

'use strict';

const fs = require('fs');

/*
 * Parses a string or buffer into an object
 * @param {(string|Buffer)} src - source to be parsed
 * @returns {Object} keys and values from src
 */
function parse (src) {
    const obj = {};

    // convert Buffers before splitting into lines and processing
    src.toString().split('\n').forEach(function (line) {
        // matching "KEY' and 'VAL' in 'KEY=VAL'
        const keyValueArr = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        // matched?
        if (keyValueArr != null) {
            const key = keyValueArr[1];

            // default undefined or missing values to empty string
            var value = keyValueArr[2] || '';

            // expand newlines in quoted values
            const len = value ? value.length : 0;
            if (len > 0 && value.charAt(0) === '"' && value.charAt(len - 1) === '"') {
                value = value.replace(/\\n/gm, '\n')
            }

            // remove any surrounding quotes and extra spaces
            value = value.replace(/(^['"]|['"]$)/g, '').trim()

            obj[key] = value
        }
    });

    return obj
}

/*
 * Main entry point into dotenv. Allows configuration before loading .env
 * @param {Object} options - options for parsing .env file
 * @param {string} [options.path=.env] - path to .env file
 * @param {string} [options.encoding=utf8] - encoding of .env file
 * @returns {Object} parsed object or error
 */
function config (options) {
    var path = '.env'
    var encoding = 'utf8'
    var envmap = process.env

    if (options) {
        if (options.path) {
            path = options.path
        }
        if (options.encoding) {
            encoding = options.encoding
        }
        if (options.map) {
            envmap = options.map
        }
    }

    try {
        // specifying an encoding returns a string instead of a buffer
        var parsedObj = parse(fs.readFileSync(path, {encoding: encoding}))

        Object.keys(parsedObj).forEach(function (key) {
            if (!envmap.hasOwnProperty(key)) {
                envmap[key] = parsedObj[key]
            } else if (options && options.throwOnOverride){
                throw new Error(key + " already has a value!")
            }
        })

        return { parsed: parsedObj }
    } catch (e) {
        return { error: e }
    }
}

module.exports.config = config;
module.exports.load = config;
module.exports.parse = parse;