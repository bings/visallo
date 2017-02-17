/**
 * These functions assist in formatting different raw datatypes to user
 * displayable strings. These utilities are split into their sections by data
 * type, see the *Namespaces* section below.
 *
 * @classdesc Utility functions for the display of data to users
 * @module formatters
 */
define([
    'sf',
    'chrono',
    'jstz',
    'moment-timezone',
    'duration-js',
    'util/messages',
    'jquery',
    'underscore'
], function(sf, chrono, jstz, moment, Duration, i18n) {
    'use strict';

    var BITS_FOR_INDEX = 12,
        BITS_FOR_OFFSET = 32 - BITS_FOR_INDEX,
        classNameIndex = 0,
        toClassNameMap = {},
        fromClassNameMap = {},
        isMac = checkIfMac(),
        isFirefox = ~navigator.userAgent.indexOf('Firefox'),
        keyboardMappings = {
            metaIcons: {
                shift: isMac ? '⇧' : i18n('keyboard.shift'),
                meta: isMac ? '⌘' : i18n('keyboard.ctrl'),
                ctrl: isMac ? '⌃' : i18n('keyboard.ctrl'),
                alt: isMac ? '⌥' : i18n('keyboard.alt')
            },
            charIcons: {
                esc: isMac ? '⎋' : null,
                escape: isMac ? '⎋' : i18n('keyboard.escape'),
                'delete': isMac ? '⌫' : null,
                backspace: isMac ? '⌦' : null,
                up: '↑',
                down: '↓',
                left: '←',
                right: '→',
                drag: isMac ? (isFirefox ? null : '') : null
            }
        };

    function checkIfMac() {
        return ~navigator.userAgent.indexOf('Mac OS X');
    }

    function codeForCharacter(character) {
        var special = {
          backspace: 8, tab: 9, clear: 12,
          enter: 13, 'return': 13,
          esc: 27, escape: 27, space: 32,
          left: 37, up: 38,
          right: 39, down: 40,
          del: 46, 'delete': 46,
          home: 36, end: 35,
          pageup: 33, pagedown: 34,
          ',': 188, '.': 190, '/': 191,
          '`': 192, '-': 189, '=': 187,
          ';': 186, '\'': 222,
          '[': 219, ']': 221, '\\': 220
        };

        // Set delete to equal backspace on mac
        if (isMac) {
            special.del = special.delete = special.backspace;
        }

        return special[character.toLowerCase()] || character.toUpperCase().charCodeAt(0);
    }

    function decimalAdjust(type, value, exp) {
		// If the exp is undefined or zero...
		if (typeof exp === 'undefined' || parseFloat(exp) === 0) {
			return Math[type](value);
		}
		value = parseFloat(value);
		exp = parseFloat(exp);
		// If the value is not a number or the exp is not an integer...
		if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
			return NaN;
		}
		// Shift
		value = value.toString().split('e');
		value = Math[type](parseFloat(value[0] + 'e' + (value[1] ? (parseFloat(value[1]) - exp) : -exp)));
		// Shift back
		value = value.toString().split('e');
		return parseFloat(value[0] + 'e' + (value[1] ? (parseFloat(value[1]) + exp) : exp));
	}

    /**
     * @alias module:formatters
     */
    var FORMATTERS = {

        /**
         * Utilities for transforming numbers
         *
         * @namespace
         */
        number: {

            /**
             * Format a number by truncated decimals to 2 digits and adding
             * thousands separators
             *
             * @param {number|string} number
             * @returns {string} formatted string for empty string if not a valid number
             */
            pretty: function(number) {
                if (_.isString(number)) {
                    number = parseFloat(number);
                }
                if (_.isNumber(number)) {
                    return sf('{0:#.##}', number)
                        .split('').reverse().join('')
                        .replace(/(\d{3}(?=\d))/g, '$1,')
                        .split('').reverse().join('');
                }

                return '';
            },

            /**
             * Format a number to an approximate number.
             * * 1000 => 1K
             * * 1000000 => 1M
             * * 1000000000 => 1B
             * * 1000000000000 => 1T
             *
             * @param {number} number The value to transform
             * @return Formatted number
             */
            prettyApproximate: function(number) {
                var isNegative = number < 0.0,
                    abs = Math.abs(number),
                    result;

                if (abs >= 1000000000000) {
                    result = (decimalAdjust('round', abs / 1000000000000, -1) + i18n('numbers.trillion_suffix'));
                } else if (abs >= 1000000000) {
                    result = (decimalAdjust('round', abs / 1000000000, -1) + i18n('numbers.billion_suffix'));
                } else if (abs >= 1000000) {
                    result = (decimalAdjust('round', abs / 1000000, -1) + i18n('numbers.million_suffix'));
                } else if (abs >= 1000) {
                    result = (decimalAdjust('round', abs / 1000, -1) + i18n('numbers.thousand_suffix'));
                } else result = FORMATTERS.number.pretty(abs);

                return (isNegative ? '-' : '') + result;
            },

            /**
             * Transform the input decimal (0-1) into a percentage
             *
             * @param {number|string} number
             * @returns {string} rounded number as percentage
             */
            percent: function(number) {
                if (_.isString(number)) {
                    number = parseFloat(number);
                }
                return Math.round(number * 100) + '%';
            },

            /*
             * Split 32-bit integers into 12-bit index, 20-bit offset
             */
            offsetValues: function(value) {
                var offsetMask = (1 << BITS_FOR_INDEX) - 1;

                return {
                    index: value >> BITS_FOR_OFFSET,
                    offset: value & offsetMask
                };
            },

            /*
             * Combine 12-bit index, 20-bit offset into 32-bit integer
             */
            compactOffsetValues: function(index, offset) {
                return (index << BITS_FOR_OFFSET) | offset;
            },

            /**
             * Convert a number in degrees to a heading string.
             * * 5.2 => North 5º
             *
             * @param {number} value
             * @returns {string} One of eight heading strings followed by
             * degrees
             */
            heading: function(value) {
                if (_.isUndefined(value)) {
                    return;
                }

                var inRange = value % 360;
                return i18n('field.heading.' + [
                    'north',
                    'northeast',
                    'east',
                    'southeast',
                    'south',
                    'southwest',
                    'west',
                    'northwest'
                ][Math.round(inRange / 45) % 8]) + ' ' + FORMATTERS.number.pretty(inRange) + '°';
            },

            /**
             * Format a number of seconds into a readable duration.
             * * 64 => 1m 4s
             *
             * @param {number|string} value Number of seconds to transform
             * @returns {string} formatted duration string
             */
            duration: function(value) {
                if (!_.isNumber(value) && !$.trim(value).length) {
                    return '';
                } else if (value === 0) {
                    return '0s';
                } else {
                    if (_.isNumber(value)) {
                        value = Math.floor(value);
                    }
                    return new Duration(value + 's').toString().replace(/(ms|[wdhms])/g, '$1 ').trim()
                }
            }
        },

        /**
         * @namespace
         */
        boolean: {

            /**
             * Converts boolean or string with 'T/F/true/false' into string true/false
             *
             * @param {boolean|string} bool input
             * @returns {string} true or false
             */
            pretty: function(bool) {
                if (_.isUndefined(bool) || (_.isString(bool) && _.isEmpty(bool))) return '';
                if (bool === 'T') bool = true;
                if (bool === 'F') bool = false;
                return bool && bool !== 'false' ?
                    i18n('boolean.true') :
                    i18n('boolean.false');
            }
        },

        /**
         * @namespace
         */
        bytes: {

            /**
             * Converts bytes to human-readable format
             * * 1024 => 1K
             *
             * Terrabyte is largest unit outputted.
             *
             * @param {number} bytes The bytes to format
             * @param {number} [precision=1] The significant digits to round
             * @returns Human readable bytes format
             */
            pretty: function(bytes, precision) {
                var k = 1024,
                    m = k * 1024,
                    g = m * 1024,
                    t = g * 1024;

                precision = _.isUndefined(precision) ? 1 : precision;

                if ((bytes >= 0) && (bytes < k)) {
                    return bytes + ' ' + i18n('bytes.suffix');

                } else if ((bytes >= k) && (bytes < m)) {
                    return (bytes / k).toFixed(precision) + ' ' + i18n('bytes.kilo');

                } else if ((bytes >= m) && (bytes < g)) {
                    return (bytes / m).toFixed(precision) + ' ' + i18n('bytes.mega');

                } else if ((bytes >= g) && (bytes < t)) {
                    return (bytes / g).toFixed(precision) + ' ' + i18n('bytes.giga');

                } else if (bytes >= t) {
                    return (bytes / t).toFixed(precision) + ' ' + i18n('bytes.tera');

                } else {
                    return bytes + ' ' + i18n('bytes.suffix');
                }
            }
        },

        className: {
            from: function(className) {
                var original = fromClassNameMap[className];
                if (!original) {
                    console.error('Never created a class for ', original);
                }
                return original;
            },
            to: function(string) {
                var className = toClassNameMap[string];
                if (!className) {
                    className = toClassNameMap[string] = 'id' + (classNameIndex++);
                }
                fromClassNameMap[className] = string;
                return className;
            }
        },

        directoryEntity: {
            pretty: function(directoryEntity) {
                if (directoryEntity && directoryEntity.type) {
                    var prettyType = directoryEntity.type === 'group' ? i18n('field.directory.group') : i18n('field.directory.person');
                    return directoryEntity.displayName + ' (' + prettyType + ')';
                } else {
                    return '';
                }
            },
            requestPretty: function(id) {
                if (!id) {
                    return Promise.resolve(null);
                }
                return Promise.require('util/withDataRequest')
                      .then(function(dr) {
                          return dr.dataRequest('directory', 'getById', id)
                      })
                      .then(function(value) {
                          return FORMATTERS.directoryEntity.pretty(value);
                      });
            }
        },

        /**
         * @namespace
         */
        geoLocation: {
            parse: function(str) {
                var m = str && str.match(/\s*point(?:\[|\()(.*?),(.*?)(?:\]|\))\s*/i);
                if (m) {
                    var latitude = m[1], longitude = m[2];
                    return {
                        latitude: latitude,
                        longitude: longitude
                    };
                }
            },

            /**
             * Format a geolocation object or string in format
             * `point[lat,lon]` into a geolocation string.
             *
             * Will also use description if available
             *
             * @param {object|string} geo The geolocation json object or point string
             * @param {number} [geo.latitude] The latitude in decimal format
             * @param {number} [geo.longitude] The longitude in decimal format
             * @param {string} [geo.description] The description of geolocation
             * @param {boolean} [withholdDescription=false] Try to disable description display
             * @returns {string} The geolocation display
             */
            pretty: function(geo, withholdDescription) {

                if (_.isString(geo)) {

                    var parsed = FORMATTERS.geoLocation.parse(geo);
                    if (parsed) {
                        return FORMATTERS.geoLocation.pretty(parsed);
                    } else {
                        return geo;
                    }
                }

                if (geo && ('latitude' in geo) && ('longitude' in geo)) {
                    var latlon = (
                            _.isNumber(geo.latitude) ? geo.latitude : parseFloat(geo.latitude)
                        ).toFixed(3) + ', ' +
                        (
                            _.isNumber(geo.longitude) ? geo.longitude : parseFloat(geo.longitude)
                        ).toFixed(3);

                    if (withholdDescription !== true && geo.description) {
                        return geo.description + ' ' + latlon;
                    }

                    return latlon;
                }
            }
        },

        object: {
            shortcut: function(key) {
                var normalized = key.replace(/\+/g, '-').toUpperCase(),
                    forLookup = normalized,
                    parts = normalized !== '-' ? normalized.split('-') : ['-'],
                    shortcut = {normalized: normalized, forEventLookup: normalized};

                if (parts.length === 1) {
                    shortcut.keyCode = codeForCharacter(parts[0]);
                    shortcut.character = parts[0];
                    shortcut.forEventLookup = shortcut.keyCode;
                } else if (parts.length === 2) {
                    shortcut.keyCode = codeForCharacter(parts[1]);
                    shortcut.character = parts[1];
                    shortcut[parts[0].toLowerCase() + 'Key'] = true;
                    shortcut.forEventLookup = parts[0] + '-' + shortcut.keyCode;
                } else if (parts.length === 3) {
                    shortcut.keyCode = codeForCharacter(parts[2]);
                    shortcut.character = parts[2];
                    shortcut[parts[0].toLowerCase() + 'Key'] = true;
                    shortcut[parts[1].toLowerCase() + 'Key'] = true;
                    shortcut.forEventLookup = parts[0] + '-' + parts[1] + '-' + shortcut.keyCode;
                } else return console.warn('Unable to add shortcut ', key);

                return shortcut;
            }
        },

        /**
         * @namespace
         */
        string: {
            normalizeAccents: function(str) {
                return str
                    .replace(/[áàãâä]/gi, 'a')
                    .replace(/[éè¨ê]/gi, 'e')
                    .replace(/[íìïî]/gi, 'i')
                    .replace(/[óòöôõ]/gi, 'o')
                    .replace(/[úùüû]/gi, 'u')
                    .replace(/[ç]/gi, 'c')
                    .replace(/[ñ]/gi, 'n');
            },

            /**
             * Convert a character and metaKeys to human-readable and
             * OS-specific keyboard shortcut display.
             *
             * @param {string} key The shortcut
             * @param {object} [metaKeys] The meta keys to include in shortcut
             * @param {boolean} [metaKeys.metaKey=false]
             * @param {boolean} [metaKeys.ctrlKey=false]
             * @param {boolean} [metaKeys.altKey=false]
             * @param {boolean} [metaKeys.shiftKey=false]
             * @returns {string} Transformed shortcut with OS-specific glyphs
             */
            shortcut: function(character, metaKeys) {
                if (!metaKeys) {
                    metaKeys = FORMATTERS.object.shortcut(character);
                    character = metaKeys.character;
                }

                var result = '';

                character = keyboardMappings.charIcons[character.toLowerCase()] ||
                    (character.length > 1 ? character.toLowerCase() : character);

                if (metaKeys.metaKey) {
                    result += keyboardMappings.metaIcons.meta + (isMac ? '' : '+');
                }
                if (metaKeys.ctrlKey) {
                    result += keyboardMappings.metaIcons.ctrl + (isMac ? '' : '+');
                }
                if (metaKeys.altKey) {
                    result += keyboardMappings.metaIcons.alt + (isMac ? '' : '+');
                }
                if (metaKeys.shiftKey) {
                    result += keyboardMappings.metaIcons.shift + (isMac ? '' : '+');
                }

                result += character;

                return result;
            },

            /**
             * Displays a count of objects with correct plural.
             * * 0, 'person', 'people' => No people
             * * 2, 'ball' => 2 balls
             *
             * @param {number} count The number of objects
             * @param {string} singular The singular version of noun
             * @param {string} [plural=singular+'s'] The plural version of noun
             * @returns {string} The count of objects with correct noun
             */
            plural: function(count, singular, plural) {
                plural = plural || (singular + 's');

                switch (count) {
                    case 0: return 'No ' + plural;
                    case 1: return '1 ' + singular;
                    default: return FORMATTERS.number.pretty(count) + ' ' + plural;
                }
            },

            /**
             * Truncate the string to given number of works and adds an
             * ellipsis.
             *
             * @param {string} str The input string
             * @param {number} words The number of words
             * @returns {string} Truncated string
             */
            truncate: function(str, words) {
                var maxChars = 7 * words,
                    string = $.trim(str),
                    wordsArray = string.split(/\s+/),
                    truncated = wordsArray.slice(0, words).join(' '),
                    ellipsis = '…';

                if (truncated.length > maxChars) {
                    // Use standard truncation (set amount of characters)
                    truncated = string.substring(0, maxChars) + ellipsis;
                } else if (truncated !== string) {
                    truncated = truncated + ellipsis;
                }

                return truncated
            },

            /**
             * Formats US phone numbers
             * * 1234567890 => 123-456-7890
             * * 123.456.7890 => 123-456-7890
             *
             * If it doesn't match the format it returns the input.
             *
             * @param {string} str Phone number string to parse
             * @returns {string} formatted phone number
             */
            phoneNumber: function(str) {
                str = (_.isNumber(str) ? ('' + str) : str) || '';
                var match = str.match(/^([0-9]{3})?[-. ]?([0-9]{3})?[-. ]?([0-9]{4})$/);
                if (match) {
                    match.shift();
                    return _.compact(match).join('-')
                }
                return str;
            },

            /**
             * Tries to match strings that look like SSN and format
             * consistently.
             * * 123 45 6789 => 123-45-6789
             * * 123456789 => 123-45-6789
             * * 123.45.6789 => 123-45-6789
             * * 123-45-6789 => 123-45-6789
             *
             * If input doesn't match SSN-like string, the input is returned as
             * is.
             *
             * @param {string} str Social Security number to parse
             * @returns {string} The formatted SSN
             */
            ssn: function(str) {
                str = (_.isNumber(str) ? ('' + str) : str) || '';
                var match = str.match(/^([0-9]{3})?[-. ]?([0-9]{2})?[-. ]?([0-9]{4})$/);

                if (match) {
                    match.shift();
                    return _.compact(match).join('-')
                }
                return str;
            },

            /**
             * @param {string} [str=''] String to uppercase
             * @returns uppercase string
             */
            uppercase: function(str) {
                return (str || '').toUpperCase();
            },

            /**
             * @param {string} [str=''] String to lowercase
             * @returns lowercase string
             */
            lowercase: function(str) {
                return (str || '').toLowerCase();
            },

            /**
             * @param {string} [str=''] String to pretty print
             * @returns string with first letter of words uppercased
             */
            prettyPrint: function(str) {
                return (str || '').replace(/\w[^-\s]*/g, function(txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                });
            }
        },

        /**
         * @namespace
         */
        date: {

            /**
             * Try to parse the input as a date.
             *
             *  Accepts partial formats like:
             *  * 2015
             *  * feb 2015
             *  * 2015 February
             *
             * @param {string} str String with date to parse
             * @return {date} parsed date
             */
            looslyParseDate: function(str) {
                str = $.trim(str);
                var date = chrono.parseDate(str),
                    match = null,
                    fixYear = function(str) {
                        if (str.length === 4) return str;
                        if (str.length === 2) {
                            var year = parseInt(str, 10);
                            return year < 59 ? '20' + year : '19' + year;
                        }
                    };

                if (!date) {
                    str = str.replace(/^([^\d\w]|_)*/, '');
                    str = str.replace(/([^\d\w]|_)*$/, '');
                    if (/^\d{4}$/.test(str)) {
                        return chrono.parseDate('jan 1 ' + str)
                    }

                    if (/^\d{2}$/.test(str)) {
                        return chrono.parseDate('jan 1 ' + fixYear(str));
                    }

                    // Month and year "feb 2015"
                    match = str.match(/^([^\d]+)\s*(\d{2,4})$/)
                    if (match) {
                        if (match[2].length === 2) {
                            match[2] = fixYear(match[2]);
                        }
                        return chrono.parseDate(match[1] + ' 1 ' + match[2]);
                    }

                    // Year and month "2015 january"
                    match = str.match(/^(\d{2,4})\s*([^\d]+)$/)
                    if (match) {
                        if (match[1].length === 2) {
                            match[1] = fixYear(match[1]);
                        }
                        return chrono.parseDate(match[2] + ' 1 ' + match[1]);
                    }
                }

                return date;
            },

            /**
             * Convert a date string to date object offset by local time.
             *
             * @param {string|number} str Input string to convert
             * @return {date} Date offset by locale.
             */
            local: function(str) {
                if (_.isUndefined(str)) return '';
                var numberOrString = _.isString(str) && !isNaN(Number(str)) ? Number(str) : str,
                    dateInLocale;

                if (_.isDate(numberOrString)) {
                    dateInLocale = numberOrString;
                } else {
                    dateInLocale = new Date(numberOrString);
                    if (isNaN(dateInLocale.getTime())) {
                        var match = numberOrString.match(/(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})\s(.*)$/);
                        if (match && match.length > 2) {
                            var parsed = match.slice(1, 3).join('T') + ':00.000';
                            dateInLocale = new Date(parsed);
                            var offset = dateInLocale.getTimezoneOffset(),
                                isNegative = offset > 0,
                                hours = '' + Math.floor(Math.abs(offset) / 60),
                                minutes = '' + (Math.abs(offset) % 60);

                            if (hours.length < 2) hours = '0' + hours;
                            if (minutes.length < 2) minutes = '0' + minutes;

                            parsed += (isNegative ? '-' : '+') + hours + ':' + minutes;
                            dateInLocale = new Date(parsed);
                        } else {
                            console.warn('Unable to parse date', numberOrString);
                            return '';
                        }
                    }
                }

                return dateInLocale;
            },

            /**
             * Convert a date string to date object ignoring local timezone
             *
             * @param {string|number} str Input string to convert
             * @return {date} Date offset in UTC
             */
            utc: function(str) {
                if (_.isUndefined(str)) return '';

                var dateInLocale = FORMATTERS.date.local(str);
                if (!dateInLocale) return '';

                var millisInMinutes = 1000 * 60,
                    millisFromLocaleToUTC = dateInLocale.getTimezoneOffset() * millisInMinutes,
                    dateInUTC = new Date(dateInLocale.getTime() + millisFromLocaleToUTC);
                return dateInUTC;
            },

            /**
             * Convert date to date string (no time)
             *
             * @param {string|number} millisStr milliseconds
             * @returns {string} Date string (no time) based on milliseconds
             */
            dateString: function(millisStr) {
                if (_.isUndefined(millisStr)) return '';
                return sf('{0:yyyy-MM-dd}', FORMATTERS.date.local(millisStr));
            },

            /**
             * Convert date to date time string, optionally to different
             * timezone.
             *
             * @param {string|number} millisStr milliseconds
             * @param {string} [overrideTzInfo=Users Timezone] Specify different TZ (UTC, etc.)
             * @returns {string} Date string (with time)
             */
            dateTimeString: function(millisStr, overrideTzInfo) {
                if (_.isUndefined(millisStr)) return '';
                var timezoneAbbreviation = overrideTzInfo;
                if (!timezoneAbbreviation) {
                    var tzInfo = FORMATTERS.timezone.currentTimezone(FORMATTERS.date.local(millisStr));
                    if (tzInfo) {
                        timezoneAbbreviation = tzInfo.tzAbbr;
                    }
                }
                return sf('{0:yyyy-MM-dd HH:mm}{1}',
                    FORMATTERS.date.local(millisStr),
                    timezoneAbbreviation ? (' ' + timezoneAbbreviation) : ''
                );
            },

            /**
             * Convert date to utc date string (no time)
             *
             * @param {string|number} millisStr milliseconds
             * @returns {string} Date string (no time) based on milliseconds
             */
            dateStringUtc: function(millisStr) {
                if (_.isUndefined(millisStr)) return '';
                return FORMATTERS.date.dateString(FORMATTERS.date.utc(millisStr));
            },

            /**
             * Convert date to UTC date time string
             *
             * @param {string|number} millisStr milliseconds
             * @returns {string} Date string (with time)
             */
            dateTimeStringUtc: function(millisStr) {
                if (_.isUndefined(millisStr)) return '';
                return FORMATTERS.date.dateTimeString(FORMATTERS.date.utc(millisStr), 'UTC');
            },

            /**
             * Convert date to time string
             *
             * @param {string|number} millisStr milliseconds
             * @returns {string} Time string (hours/minutes)
             */
            timeString: function(millisStr) {
                if (_.isUndefined(millisStr)) return '';
                return sf('{0:HH:mm}', FORMATTERS.date.local(millisStr));
            },

            /**
             * Convert date to UTC time string
             *
             * @param {string|number} millisStr milliseconds
             * @returns {string} Time string (hours/minutes)
             */
            timeStringUtc: function(millisStr) {
                if (_.isUndefined(millisStr)) return '';
                return FORMATTERS.date.timeString(FORMATTERS.date.utc(millisStr));
            },

            /**
             * Returns relative time with "ago" suffix.
             * * moments ago
             * * 5 minutes ago
             *
             * @param {number} date in milliseconds
             * @returns {string} Relative time string from now to input
             */
            relativeToNow: function(date) {
                return FORMATTERS.date.relativeToDate(date, FORMATTERS.date.utc(Date.now())) + ' ' + i18n('time.ago');
            },

            /**
             * Returns relative time
             * * moments
             * * 5 minutes
             * * 4 years
             *
             * @param {number} date in milliseconds
             * @returns {string} Relative time string from now to input
             */
            relativeToDate: function(date, fromDate) {
                if (_.isUndefined(date)) return '';
                var span = new sf.TimeSpan(fromDate - date),
                    time = '';

                if (span.years > 1) {
                    time = sf("{0:^y '" + i18n('time.years') + "'}", span);
                } else if (span.years === 1) {
                    time = i18n('time.year');
                } else if (span.months > 1) {
                    time = sf("{0:^M '" + i18n('time.months') + "'}", span);
                } else if (span.months === 1) {
                    time = i18n('time.month');
                } else if (span.days > 1) {
                    time = sf("{0:^d '" + i18n('time.days') + "'}", span);
                } else if (span.days === 1) {
                    time = i18n('time.day');
                } else if (span.hours > 1) {
                    time = sf("{0:^h '" + i18n('time.hours') + "'}", span);
                } else if (span.hours === 1) {
                    time = i18n('time.hour');
                } else if (span.minutes > 1) {
                    time = sf("{0:^m '" + i18n('time.minutes') + "'}", span);
                } else if (span.minutes === 1) {
                    time = i18n('time.minute');
                } else {
                    time = i18n('time.moments');
                }

                return time;
            },

            /**
             * Add / Decrement days from initial date.
             *
             * @param {date} date Initial date
             * @param {number} numDays Increment days by this
             * @return {date} date offset by numDays
             */
            addDaysToDate: function(date, numDays) {
                var newDate = new Date(date.valueOf());
                newDate.setDate(newDate.getDate() + numDays);
                return newDate;
            },

            dateToDateString: function(date) {
                return date.toISOString().replace(/T.*$/, '');
            },

            addDaysToDateString: function(dateString, numDays) {
                return FORMATTERS.date.dateToDateString(FORMATTERS.date.addDaysToDate(new Date(dateString), numDays));
            }
        },

        timezone: {
            dateTimeStringToTimezone: function(dateStr, srcTimezone, destTimezone) {
                var dateTz = FORMATTERS.timezone.date(dateStr, srcTimezone);

                return dateTz.tz(destTimezone).format('YYYY-MM-DD HH:mm');
            },
            dateTimeStringToUtc: function(dateStr, timezone) {
                return FORMATTERS.timezone.dateTimeStringToTimezone(dateStr, timezone, 'Etc/UTC');
            },
            date: function(dateStr, timezone) {
                if (/^\s*$/.test(dateStr)) {
                    return dateStr;
                }
                return _.isNumber(dateStr) ?
                    moment.tz(dateStr, timezone) :
                    moment.tz(dateStr, 'YYYY-MM-DD HH:mm', timezone);
            },
            offsetDisplay: function(offsetMinutes) {
                var negative = offsetMinutes < 0,
                    offsetMinutesAbs = Math.abs(offsetMinutes),
                    hours = Math.floor(offsetMinutesAbs / 60),
                    minutes = Math.floor(offsetMinutesAbs % 60);

                if (('' + hours).length === 1) {
                    hours = '0' + hours;
                }
                if (('' + minutes).length === 1) {
                    minutes = '0' + minutes;
                }

                return (negative ? '-' : '+') + hours + ':' + minutes;
            },
            list: function() {
                return _.chain(jstz.olson.timezones)
                    .map(function(name, key) {
                        var components = key.split(','),
                            offsetMinutes = parseInt(components[0], 10),
                            dst = components.length > 1 && components[1] === '1';

                        return [
                            name,
                            {
                                offset: offsetMinutes,
                                offsetDisplay: FORMATTERS.timezone.offsetDisplay(offsetMinutes),
                                name: name,
                                dst: dst
                            }
                        ];
                    })
                    .object()
                    .value();
            },

            lookupTimezone: function(name, withOffsetForDate) {
                var list = FORMATTERS.timezone.list(),
                    tz = list[name];

                if (withOffsetForDate && withOffsetForDate.getTime) {
                    withOffsetForDate = withOffsetForDate.getTime();
                }

                if (!withOffsetForDate || isNaN(withOffsetForDate)) {
                    withOffsetForDate = Date.now();
                }

                var momentZone = moment.tz.zone(name);
                if (!momentZone) {
                    throw new Error('Could not find timezone "' + name + '"');
                }
                var offset = momentZone.offset(withOffsetForDate) * -1,
                    tzInfo = {
                        tzOffset: offset,
                        tzAbbr: momentZone.abbr(withOffsetForDate),
                        tzOffsetDisplay: FORMATTERS.timezone.offsetDisplay(offset)
                    };

                return $.extend({}, tz, tzInfo);
            },

            currentTimezone: _.once(function() {
                return FORMATTERS.timezone.lookupTimezone(jstz.determine().name());
            })
        }
    };

    FORMATTERS.string.palantirPrettyPrint = FORMATTERS.string.prettyPrint;

    return FORMATTERS;
});
