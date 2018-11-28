// dateFormat.js
// ------------------------------------------------------------------
//
// Provide a dateFormat function for JavaScript that simulates or
// replicates PHP's date function.
//
// example usage:
//     var dateFormat = require('./lib/dateFormat.js').dateFormat;
//     var d = new Date();
//     var s1 = dateFormat(d,"Y-M-d\\TH:i:s.u");  // 2017-Mar-20T12:38:29.972
//     var s2 = dateFormat(d,"Y-M-d\\TH:i:s");  // 2017-Mar-20T12:38:29
//     var iso8601 = dateFormat(d,"c");  // 2017-Mar-20T12:38:29+07:00
//
// LICENSE:
// This is free and unencumbered software released into the public domain.
//
// Anyone is free to copy, modify, publish, use, compile, sell, or
// distribute this software, either in source code form or as a compiled
// binary, for any purpose, commercial or non-commercial, and by any
// means.
//
// In jurisdictions that recognize copyright laws, the author or authors
// of this software dedicate any and all copyright interest in the
// software to the public domain. We make this dedication for the benefit
// of the public at large and to the detriment of our heirs and
// successors. We intend this dedication to be an overt act of
// relinquishment in perpetuity of all present and future rights to this
// software under copyright law.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// For more information, please refer to <http://unlicense.org>
//
// created: Wed Apr 22 12:47:26 2015
// last saved: <2017-March-20 13:52:50>

(function (){
  var internal = {
        shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        longDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      };
  var replaceChars = {
        // Day
        d: function() {
          return (this.getDate() < 10 ? '0' : '') + this.getDate();
        },
        D: function() {
          return internal.shortDays[this.getDay()];
        },
        j: function() {
          return this.getDate();
        },
        l: function() {
          return internal.longDays[this.getDay()];
        },
        N: function() {
          return this.getDay() + 1;
        },
        S: function() {
          return (this.getDate() % 10 == 1 &&
                  this.getDate() != 11 ? 'st' : (this.getDate() % 10 == 2 && this.getDate() != 12 ? 'nd' :
                                              (this.getDate() % 10 == 3 && this.getDate() != 13 ? 'rd' : 'th')));
        },
        w: function() {
          return this.getDay();
        },
        z: function() {
          var d1 = new Date(this.getFullYear(), 0, 1);
          return Math.ceil((this - d1) / 86400000);
        },

        // Week
        W: function() {
          var d1 = new Date(this.getFullYear(), 0, 1);
          return Math.ceil((((this - d1) / 86400000) + this.getDay() + 1) / 7);
        },
        // Month
        F: function() {
          return internal.longMonths[this.getMonth()];
        },
        m: function() {
          return (this.getMonth() < 9 ? '0' : '') + (this.getMonth() + 1);
        },
        M: function() {
          return internal.shortMonths[this.getMonth()];
        },
        n: function() {
          return this.getMonth() + 1;
        },
        t: function() {
          var d1 = new Date();
          return new Date(d1.getFullYear(), d1.getMonth(), 0).getDate();
        },

        // Year
        L: function() {
          var year = this.getFullYear();
          return (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0));
        },
        o: function() {
          var d1 = new Date(this.valueOf());
          d1.setDate(d1.getDate() - ((this.getDay() + 6) % 7) + 3);
          return d1.getFullYear();
        },

        Y: function() {
          return this.getFullYear();
        },
        y: function() {
          return ('' + this.getFullYear()).substr(2);
        },
        a: function() {
          return this.getHours() < 12 ? 'am' : 'pm';
        },
        A: function() {
          return this.getHours() < 12 ? 'AM' : 'PM';
        },
        B: function() {
          return Math.floor((((this.getUTCHours() + 1) % 24) + this.getUTCMinutes() / 60 + this.getUTCSeconds() / 3600) * 1000 / 24);
        },
        g: function() {
          return this.getHours() % 12 || 12;
        },
        G: function() {
          return this.getHours();
        },
        h: function() {
          return ((this.getHours() % 12 || 12) < 10 ? '0' : '') + (this.getHours() % 12 || 12);
        },
        H: function() {
          return (this.getHours() < 10 ? '0' : '') + this.getHours();
        },
        i: function() {
          return (this.getMinutes() < 10 ? '0' : '') + this.getMinutes();
        },
        s: function() {
          return (this.getSeconds() < 10 ? '0' : '') + this.getSeconds();
        },
        u: function() {
          var m = this.getMilliseconds();
          return (m < 10 ? '00' : (m < 100 ? '0' : '')) + m;
        },
        // Timezone
        e: function() {
          return "Not Yet Supported";
        },
        I: function() {
          return "Not Yet Supported";
        },
        O: function() {
          return (this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + '00';
        },
        P: function() {
          return (this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + ':00';
        },
        T: function() {
          var m = this.getMonth();
          this.setMonth(0);
          var result = this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/, '$1');
          this.setMonth(m);
          return result;
        },
        Z: function() {
          return this.getTimezoneOffset() * 60;
        },
        // Full iso8601-compliant Date/Time with TZ offset
        c: function() {
          return dateFormat(d,"Y-m-d\\TH:i:sP");
        },
        r: function() {
          return this.toString();
        },
        U: function() {
          return this.getTime() / 1000;
        }
      };


  // Simulates PHP's date function
  function dateFormat(date, format) {
    var returnStr = '';

    for (var i = 0; i < format.length; i++) {
      var curChar = format.charAt(i);
      if (i - 1 >= 0 && format.charAt(i - 1) == "\\") {
        returnStr += curChar;
      } else if (replaceChars[curChar]) {
        returnStr += replaceChars[curChar].call(date);
      } else if (curChar != "\\") {
        returnStr += curChar;
      }
    }
    return returnStr;
  }

  // export into the global namespace
  if (typeof exports === "object" && exports) {
    // works for nodejs
    exports.dateFormat = dateFormat;
  }
  else {
    // works in rhino
    var globalScope = (function(){ return this; }).call(null);
    globalScope.dateFormat = dateFormat;
  }

}());
