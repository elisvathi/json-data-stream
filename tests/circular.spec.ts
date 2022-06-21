import {
  deserializeCircular,
  serializeCircular,
} from '../src/core/codecs/circular';
import _ from 'lodash';

const Circular = {
  stringify: (data: any) => JSON.stringify(serializeCircular(data as any)),
  parse: (data: string) => deserializeCircular(JSON.parse(data)),
};
function makeTest(arg: boolean, name: string) {
  if (typeof name === 'string') {
    return test(name, () => {
      expect(arg).toBe(true);
    });
  }
}

makeTest(Circular.stringify([null, null]) === '[[null,null]]', 'multiple null');

var a: any[] = [];
var o: any = {};

makeTest(Circular.stringify(a) === '[[]]', 'empty Array');
makeTest(Circular.stringify(o) === '[{}]', 'empty Object');

a.push(a);
o.o = o;

makeTest(Circular.stringify(a) === '[["0"]]', 'recursive Array');
makeTest(Circular.stringify(o) === '[{"o":"0"}]', 'recursive Object');

var b = Circular.parse(Circular.stringify(a));
makeTest(Array.isArray(b) && b[0] === b, 'restoring recursive Array');

a.push(1, 'two', true);
o.one = 1;
o.two = 'two';
o.three = true;
makeTest(
  Circular.stringify(a) === '[["0",1,"1",true],"two"]',
  'values in Array',
);
makeTest(
  Circular.stringify(o) === '[{"o":"0","one":1,"two":"1","three":true},"two"]',
  'values in Object',
);

a.push(o);
o.a = a;

makeTest(
  Circular.stringify(a) ===
    '[["0",1,"1",true,"2"],"two",{"o":"2","one":1,"two":"1","three":true,"a":"0"}]',
  'object in Array',
);
makeTest(
  Circular.stringify(o) ===
    '[{"o":"0","one":1,"two":"1","three":true,"a":"2"},"two",["2",1,"1",true,"0"]]',
  'array in Object',
);

a.push({ test: 'OK' }, [1, 2, 3]);
o.test = { test: 'OK' };
o.array = [1, 2, 3];
makeTest(
  _.isEqual(Circular.parse(Circular.stringify(a)), a),
  'objects in Array',
);
makeTest(
  _.isEqual(Circular.parse(Circular.stringify(o)), o),
  'objects in Object',
);

a = Circular.parse(Circular.stringify(a)) as any;
o = Circular.parse(Circular.stringify(o));

makeTest(a[0] === a, 'parsed Array');
makeTest(o.o === o, 'parsed Object');

makeTest(
  a[1] === 1 &&
    a[2] === 'two' &&
    a[3] === true &&
    a[4] instanceof Object &&
    JSON.stringify(a[5]) === JSON.stringify({ test: 'OK' }) &&
    JSON.stringify(a[6]) === JSON.stringify([1, 2, 3]),
  'array values are all OK',
);

makeTest(a[4] === a[4].o && a === a[4].o.a, 'array recursive values are OK');

makeTest(
  o.one === 1 &&
    o.two === 'two' &&
    o.three === true &&
    Array.isArray(o.a) &&
    JSON.stringify(o.test) === JSON.stringify({ test: 'OK' }) &&
    JSON.stringify(o.array) === JSON.stringify([1, 2, 3]),
  'object values are all OK',
);

makeTest(o.a === o.a[0] && o === o.a[4], 'object recursive values are OK');

makeTest(
  Circular.parse(Circular.stringify(1)) === 1,
  'numbers can be parsed too',
);
makeTest(
  Circular.parse(Circular.stringify(false)) === false,
  'booleans can be parsed too',
);
makeTest(
  Circular.parse(Circular.stringify(null)) === null,
  'null can be parsed too',
);
makeTest(
  Circular.parse(Circular.stringify('test')) === 'test',
  'strings can be parsed too',
);

var d = new Date();
makeTest(
  Circular.parse(Circular.stringify(d)) === d.toISOString(),
  'dates can be parsed too',
);

(function () {
  var special = '\\x7e'; // \x7e is ~
  //console.log(Flatted.stringify({a:special}));
  //console.log(Flatted.parse(Flatted.stringify({a:special})).a);
  makeTest(
    (Circular.parse(Circular.stringify({ a: special })) as any).a === special,
    'no problem with simulation',
  );
  special = '~\\x7e';
  makeTest(
    (Circular.parse(Circular.stringify({ a: special })) as any).a === special,
    'no problem with special char',
  );
})();

(function () {
  var o = { a: 'a', b: 'b', c: function () {}, d: { e: 123 } },
    a = JSON.stringify(o),
    b = Circular.stringify(o);

  makeTest(
    JSON.stringify(JSON.parse(a)) === JSON.stringify(Circular.parse(b)),
    'works as JSON.parse',
  );
})();

(function () {
  var o: any = {},
    before: string;
  o.a = o;
  o.c = {};
  o.d = {
    a: 123,
    b: o,
  };
  o.c.e = o;
  o.c.f = o.d;
  o.b = o.c;
  before = Circular.stringify(o);
  o = Circular.parse(before);
  makeTest(
    o.b === o.c &&
      o.c.e === o &&
      o.d.a === 123 &&
      o.d.b === o &&
      o.c.f === o.d &&
      o.b === o.c,
    'recreated original structure',
  );
})();

(function () {
  var o: any = {};
  o['~'] = o;
  o['\\x7e'] = '\\x7e';
  o.test = '~';

  o = Circular.parse(Circular.stringify(o));
  makeTest(o['~'] === o && o.test === '~', 'still intact');
  o = {
    a: ['~', '~~', '~~~'],
  };
  o.a.push(o);
  o.o = o;
  o['~'] = o.a;
  o['~~'] = o.a;
  o['~~~'] = o.a;
  o = Circular.parse(Circular.stringify(o));
  makeTest(
    o === o.a[3] &&
      o === o.o &&
      o['~'] === o.a &&
      o['~~'] === o.a &&
      o['~~~'] === o.a &&
      o.a === o.a[3].a &&
      o.a.pop() === o &&
      o.a.join('') === '~~~~~~',
    'restructured',
  );
})();

(function () {
  // make sure only own properties are parsed
  (Object.prototype as any).shenanigans = true;
  var item: any = {
      name: 'TEST',
    },
    original = {
      outer: [
        {
          a: 'b',
          c: 'd',
          one: item,
          many: [item],
          e: 'f',
        },
      ],
    },
    str,
    output;
  item.value = item;
  str = Circular.stringify(original);
  output = Circular.parse(str);
  makeTest(_.isEqual(original, output), 'string is correct');
  makeTest(
    original.outer[0].one.name === (output as any).outer[0].one.name &&
      original.outer[0].many[0].name ===
        (output as any).outer[0].many[0].name &&
      (output as any).outer[0].many[0] === (output as any).outer[0].one,
    'object too',
  );

  delete (Object.prototype as any).shenanigans;
})();

(function () {
  var unique = { a: 'sup' },
    nested = {
      prop: {
        value: 123,
      },
      a: [
        {},
        {
          b: [
            {
              a: 1,
              d: 2,
              c: unique,
              z: {
                g: 2,
                a: unique,
                b: {
                  r: 4,
                  u: unique,
                  c: 5,
                },
                f: 6,
              },
              h: 1,
            },
          ],
        },
      ],
      b: {
        e: 'f',
        t: unique,
        p: 4,
      },
    },
    str = Circular.stringify(nested),
    output;
  makeTest(_.isEqual(Circular.parse(str), nested), 'string is OK');
  output = Circular.parse(str);
  makeTest(
    (output as any).b.t.a === 'sup' &&
      (output as any).a[1].b[0].c === (output as any).b.t,
    'so is the object',
  );
})();

(function () {
  var o = { bar: 'something ~ baz' };
  var s = Circular.stringify(o);
  makeTest(s === '[{"bar":"1"},"something ~ baz"]', 'string is correct');
  var oo = Circular.parse(s);
  makeTest((oo as any).bar === o.bar, 'parse is correct');
})();

(function () {
  var o: any = {};
  o.a = {
    aa: {
      aaa: 'value1',
    },
  };
  o.b = o;
  o.c = {
    ca: {},
    cb: {},
    cc: {},
    cd: {},
    ce: 'value2',
    cf: 'value3',
  };
  o.c.ca.caa = o.c.ca;
  o.c.cb.cba = o.c.cb;
  o.c.cc.cca = o.c;
  o.c.cd.cda = o.c.ca.caa;

  var s = Circular.stringify(o);
  makeTest(_.isEqual(Circular.parse(s), o), 'string is correct');
  var oo: any = Circular.parse(s);
  makeTest(
    (oo.a.aa.aaa =
      'value1' &&
      oo === oo.b &&
      oo.c.ca.caa === oo.c.ca &&
      oo.c.cb.cba === oo.c.cb &&
      oo.c.cc.cca === oo.c &&
      oo.c.cd.cda === oo.c.ca.caa &&
      oo.c.ce === 'value2' &&
      oo.c.cf === 'value3'),
    'parse is correct',
  );
})();

(function () {
  var original: any = {
      a1: {
        a2: [],
        a3: [{ name: 'whatever' }],
      },
      a4: [],
    },
    json: any,
    restored: any;

  original.a1.a2[0] = original.a1;
  original.a4[0] = original.a1.a3[0];

  json = Circular.stringify(original);
  restored = Circular.parse(json);

  makeTest(
    (restored as any).a1.a2[0] === (restored as any).a1,
    '~a1~a2~0 === ~a1',
  );
  makeTest(
    (restored as any).a4[0] === (restored as any).a1.a3[0],
    '~a4 === ~a1~a3~0',
  );
})();

if (typeof Symbol !== 'undefined') {
  (function () {
    var o: any = { a: 1 };
    var a = [1, Symbol('test'), 2];
    o[Symbol('test')] = 123;
    makeTest(
      '[' + JSON.stringify(o) + ']' === Circular.stringify(o),
      'Symbol is OK too',
    );
    makeTest(
      '[' + JSON.stringify(a) + ']' === Circular.stringify(a),
      'non symbol is OK too',
    );
  })();
}

(function () {
  var a: any = { b: { '': { c: { d: 1 } } } };
  a._circular = a.b[''];
  var json = Circular.stringify(a);
  var nosj: any = Circular.parse(json);
  makeTest(
    nosj._circular === nosj.b[''] &&
      JSON.stringify(nosj._circular) === JSON.stringify(a._circular),
    'empty keys as non root objects work',
  );
  delete a._circular;
  delete nosj._circular;
  makeTest(
    JSON.stringify(nosj) === JSON.stringify(a),
    'objects copied with circular empty keys are the same',
  );
})();

['65515.json', '65518.json'].forEach((fileName) => {
  let dataString = require('fs')
    .readFileSync('tests/' + fileName)
    .toString('utf-8');
  let rawJson = JSON.parse(dataString);
  let { toolData } = rawJson;
  makeTest(
    typeof Circular.parse(JSON.stringify(toolData)) === 'object',
    'is json file object',
  );
});
