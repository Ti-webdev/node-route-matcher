/*
 * JavaScript Route Matcher
 * http://benalman.com/
 *
 * Copyright (c) 2011 "Cowboy" Ben Alman
 * Copyright (c) 2013 "Ti" Vasily Mikhaylovsky
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */

// Characters to be escaped with \. RegExp borrowed from the Backbone router
// but escaped (note: unnecessarily) to keep JSHint from complaining.
var reEscape = /[\-\[\]{}()+?.,\\\^$|#\s]/g;

// Match named :param or *splat placeholders.
var reParam = /([:*])(\w+)/g;

// Test to see if a value matches the corresponding rule.
function validateRule(rule, value) {
    if (rule instanceof RegExp) {
        return rule.test(value);
    }
    if (rule instanceof Function) {
        return rule(value);
    }
    return rule == value;
}

var RouteMatcherSimple = function(route, rules) {
    this.route = route;
    this.rules = rules;

    // Matched param or splat names, in order
    var names = [];

    // Build route RegExp from passed string.
    // Route matching RegExp.
    var re = route;

    // Escape special chars.
    re = re.replace(reEscape, "\\$&");
    // Replace any :param or *splat with the appropriate capture group.
    re = re.replace(reParam, function(_, mode, name) {
        names.push(name);
        // :param should capture until the next / or EOL, while *splat should
        // capture until the next :param, *splat, or EOL.
        return mode === ":" ? "([^/]*)" : "(.*)";
    });
    this.names = names;

    // Add ^/$ anchors and create the actual RegExp.
    this.re = new RegExp("^" + re + "$");
};

// Match the passed url against the route, returning an object of params
// and values.
RouteMatcherSimple.prototype.parse = function(url) {
    var i = 0;
    var param, value;
    var params = {};
    var matches = url.match(this.re);
    // If no matches, return null.
    if (!matches) { return null; }
    // Add all matched :param / *splat values into the params object.
    while (i < this.names.length) {
        param = this.names[i++];
        value = matches[i];
        // If a rule exists for thie param and it doesn't validate, return null.
        if (this.rules && param in this.rules && !validateRule(this.rules[param], value)) { return null; }
        params[param] = value;
    }
    return params;
};


// Build path by inserting the given params into the route.
RouteMatcherSimple.prototype.stringify = function(params) {
    var param, re;
    var result = this.route;
    // Insert each passed param into the route string. Note that this loop
    // doesn't check .hasOwnProperty because this script doesn't support
    // modifications to Object.prototype.
    for (param in params) {
        re = new RegExp("[:*]" + param + "\\b");
        result = result.replace(re, params[param]);
    }
    // Missing params should be replaced with empty string.
    return result.replace(reParam, "");
};

RouteMatcherSimple.prototype.toString = function() {
    return this.route;
};

var routeMatcherRegExp = function(route) {
    this.route = route;
};

// RegExp route was passed. This is super-simple.
routeMatcherRegExp.prototype.parse = function(url) {
    var matches = url.match(this.route);
    return matches && {captures: matches.slice(1)};
};

// There's no meaningful way to stringify based on a RegExp route, so
// return empty string.
routeMatcherRegExp.prototype.stringify = function() {
    return "";
}

routeMatcherRegExp.prototype.toString = function() {
    return this.route.toString();
};

module.exports = function (route, rules) {
    if (route instanceof RegExp) {
        return new routeMatcherRegExp(route);
    } else {
        return new RouteMatcherSimple(route, rules);
    }
};