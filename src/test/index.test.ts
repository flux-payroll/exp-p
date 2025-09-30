import { createParser, FunctionMap, UnaryOperatorMap } from '../'

describe('example', () => {

  it('basic operator', () => {
    const parser = createParser({
    })
    expect(parser.evaluate('(2 + 3) * 4 - 4')).toBe(16)
    expect(parser.evaluate('-4 + 5')).toBe(1)
    expect(parser.evaluate('4 <= (5 + 2)')).toBe(true)
    expect(parser.evaluate('4 > 5')).toBe(false)
    expect(parser.evaluate('5 ^ 2 + 2')).toBe(27)
    expect(parser.evaluate('5 + 4 * 4')).toBe(21)
    expect(parser.evaluate('5 % 3')).toBe(2)
    expect(parser.evaluate('5.5 * 3')).toBe(16.5)
    expect(parser.evaluate('5 == 5')).toBe(true)
  });
  it('function', () => {
    // Usage example
    const variables = { x: 5 };
    const functions: FunctionMap = {
      add: (_, a: number, b: number) => a + b,
      length: (_, str: string) => str.length,
      length_all: (_, str1: string, str2: string, str3: string) => [str1.length, str2.length, str3.length],
    };
    const parser = createParser({ variables });
    parser.setFunctions(functions)
    expect(parser.evaluate('add(1 + 1, 5) + x')).toBe(12)
    expect(parser.evaluate('length("ADI") + 5', variables)).toBe(8)
    expect(parser.evaluate('length_all("ADI", "FA", "TK")', variables)).toEqual([3, 2, 2])
  });
  it('string', () => {
    const parser = createParser();
    expect(parser.evaluate('"ADI"')).toBe("ADI")
    expect(parser.evaluate('\'ADI\'')).toBe("ADI")
    expect(parser.evaluate('regex("ddd212sdf","\\d\\w\\d")')).toBe(true)
    expect(parser.evaluate('regex("ddd212sdf","\\d\\w\\d","y")')).toBe(false)
  })
  it('boolean', () => {
    const parser = createParser();
    expect(parser.evaluate('true and false')).toBe(false)
    expect(parser.evaluate('true or false')).toBe(true)
    expect(parser.evaluate('!true')).toBe(false)
    expect(parser.evaluate('!!true')).toBe(true)
  })
  it('array', () => {
    const parser = createParser();
    expect(parser.evaluate("[1, 2, 3, 4]")).toEqual([1, 2, 3, 4])
    expect(parser.evaluate("[\"2\", 5]")).toEqual(["2", 5])
    expect(parser.evaluate("[2 + 5, 5]")).toEqual([7, 5])
    expect(parser.evaluate("[5, x]", { x: 2 })).toEqual([5, 2])
  })
  it('array method', () => {
    const parser = createParser();

    expect(
      parser.evaluate('unique(products)', {
        products: [1, 1, 4, 5, 6, 6, 7, 7, 8, 8]
      })
    ).toEqual([1, 4, 5, 6, 7, 8])

    const products = [
      { name: 'Product 1', price: 150, quantity: 2 },
      { name: 'Product 2', price: 80, quantity: 0 },
      { name: 'Product 3', price: 200, quantity: 5 },
      { name: 'Product 4', price: 120, quantity: 1 },
      { name: 'Product 4', price: 120, quantity: 1 }
    ];
    expect(
      parser.evaluate('unique(products, "_item_.name")', {
        products
      })
    ).toEqual([
      { name: 'Product 1', price: 150, quantity: 2 },
      { name: 'Product 2', price: 80, quantity: 0 },
      { name: 'Product 3', price: 200, quantity: 5 },
      { name: 'Product 4', price: 120, quantity: 1 },
    ])

    expect(
      parser.evaluate('filter(products, "_item_.price > 100 and _item_.quantity > 0")', {
        products
      })
    ).toEqual([
      { name: 'Product 1', price: 150, quantity: 2 },
      { name: 'Product 3', price: 200, quantity: 5 },
      { name: 'Product 4', price: 120, quantity: 1 },
      { name: 'Product 4', price: 120, quantity: 1 },
    ])

    expect(
      parser.evaluate('map(products, "_item_.name")', {
        products
      })
    ).toEqual([
      'Product 1',
      'Product 2',
      'Product 3',
      'Product 4',
      'Product 4',
    ])

    expect(
      parser.evaluate('find(products, "_item_.price > 0")', {
        products
      })
    ).toEqual({
      "name": "Product 1",
      "price": 150,
      "quantity": 2
    })

    expect(
      parser.evaluate('some(products, "_item_.price == 200")', {
        products
      })
    ).toBe(true)

    expect(
      parser.evaluate('reduce(products, "_curr_ + _item_.price", 0)', {
        products
      })
    ).toBe(670)
  })
  it('object', () => {
    const parser = createParser();
    expect(parser.evaluate("{ name: 'ADI', age: 20 }")).toEqual({
      name: "ADI",
      age: 20
    })
    expect(parser.evaluate("{ name: 'ADI', age: 5 + 2 }")).toEqual({
      name: "ADI",
      age: 7
    })
    expect(parser.evaluate("object.name", { object: { name: 'ADI' } })).toEqual('ADI')
    expect(parser.evaluate("object.name", { object: { name: 'ADI' } })).toEqual('ADI')
    expect(parser.evaluate("object.0.name", { object: [{ name: 'ADI' }] })).toEqual('ADI')
    expect(parser.evaluate("object.0.object.0.name", { object: [{ name: 'ADI', object: [{ name: "ADI" }] }] })).toEqual('ADI')
    expect(parser.evaluate("{ name: 'ADI', age: 20, ...z, student: false }", { z: { address: 'jl indonesia' } })).toEqual(
      {
        "address": "jl indonesia",
        "age": 20,
        "name": "ADI",
        "student": false,
      }
    )
  })
  it('date', () => {
    const parser = createParser();

    // expect(parser.evaluate(`date()`)).toBe(moment().toISOString())
    // expect(parser.evaluate(`date("2020-01-01")`)).toBe('2019-12-31T17:00:00.000Z')
    expect(parser.evaluate(`date_day(date("2020-01-01"))`)).toBe(1)
    expect(parser.evaluate(`date_month(date("2020-01-01"))`)).toBe(1)
    expect(parser.evaluate(`date_year(date("2020-01-01"))`)).toBe(2020)
    expect(parser.evaluate(`date_format("DD-MM-YYYY", "2020-01-01")`)).toBe("01-01-2020")
    // expect(parser.evaluate(`date_in_format("YYYY-MM-DD", "2020-01-01")`)).toBe('2019-12-31T17:00:00.000Z')
    // expect(parser.evaluate(`date_in_millis(${moment("2020/01/01", 'YYYY/MM/DD').valueOf()})`)).toBe('2019-12-31T17:00:00.000Z')
    // expect(parser.evaluate(`date_millis("2020-01-01")`)).toBe(1577811600000)
    expect(parser.evaluate(`date_format("DD-MM-YYYY", date_plus(1, "day", "2020-01-05"))`)).toBe("06-01-2020")
    // expect(parser.evaluate(`date_format("DD-MM-YYYY", date_plus(-1, "day", "2020-01-05"))`)).toBe("04-01-2020")
    expect(parser.evaluate(`date_format("DD-MM-YYYY", date_minus(1, "day", "2020-01-05"))`)).toBe("04-01-2020")
    // expect(parser.evaluate(`date_format("DD-MM-YYYY", date_minus(-1, "day", "2020-01-05"))`)).toBe("06-01-2020")
  })
  it('invalid expressions', () => {
    const parser = createParser();

    // Invalid operator combinations
    expect(() => parser.evaluate('3 +* 5')).toThrow('Invalid expression')
    expect(() => parser.evaluate('2 */ 4')).toThrow('Invalid expression')
    expect(parser.evaluate('1 +- 3')).toBe(-2) // This is now valid: 1 + (-3) = -2
    expect(() => parser.evaluate('5 ^* 2')).toThrow('Invalid expression')
    expect(() => parser.evaluate('4 %/ 2')).toThrow('Invalid expression')

    // Missing operands
    expect(() => parser.evaluate('5 +')).toThrow('Invalid expression')
    expect(() => parser.evaluate('* 3')).toThrow('Invalid expression')
    expect(() => parser.evaluate('/ 2')).toThrow('Invalid expression')
    expect(() => parser.evaluate('2 *')).toThrow('Invalid expression')
    expect(() => parser.evaluate('+ 5 -')).toThrow('Invalid expression')

    // Mismatched parentheses
    expect(() => parser.evaluate('(5 + 3')).toThrow('Invalid expression')
    expect(() => parser.evaluate('5 + 3)')).toThrow('Invalid expression')
    expect(() => parser.evaluate('((5 + 3)')).toThrow('Invalid expression')
    expect(() => parser.evaluate('(5 + 3))')).toThrow('Invalid expression')

    // Invalid operators at start/end
    expect(() => parser.evaluate('and 5')).toThrow('Invalid expression')
    expect(() => parser.evaluate('5 and')).toThrow('Invalid expression')
    expect(() => parser.evaluate('or true')).toThrow('Invalid expression')
    expect(() => parser.evaluate('false or')).toThrow('Invalid expression')

    // Multiple consecutive operators
    expect(() => parser.evaluate('3 ++ 5')).toThrow('Invalid expression')
    expect(parser.evaluate('4 -- 2')).toBe(6) // This is now valid: 4 - (-2) = 6
    expect(() => parser.evaluate('2 ** 3')).toThrow('Invalid expression')
    expect(() => parser.evaluate('5 /// 2')).toThrow('Invalid expression')

    // Invalid comparisons
    expect(() => parser.evaluate('5 >> 3')).toThrow('Invalid expression')
    expect(() => parser.evaluate('2 << 4')).toThrow('Invalid expression')
    expect(() => parser.evaluate('3 === 3')).toThrow('Invalid expression')
    expect(() => parser.evaluate('4 !== 4')).toThrow('Invalid expression')

    // Empty expressions
    expect(() => parser.evaluate('')).toThrow('Invalid expression')
    expect(() => parser.evaluate('   ')).toThrow('Invalid expression')

    // Invalid function calls
    expect(() => parser.evaluate('unknownFunction(5)')).toThrow('Invalid expression')
    expect(() => parser.evaluate('add(')).toThrow('Invalid expression')
    expect(() => parser.evaluate('add(5')).toThrow('Invalid expression')
    expect(() => parser.evaluate('add 5)')).toThrow('No value provided for variable add')

    // Invalid array syntax
    expect(() => parser.evaluate('[1, 2')).toThrow('Invalid expression')
    expect(() => parser.evaluate('1, 2]')).toThrow('Invalid expression')
    expect(() => parser.evaluate('[1 2]')).toThrow('Invalid expression')

    // Invalid object syntax
    expect(() => parser.evaluate('name: "test" }')).toThrow('No value provided for variable name')
    expect(() => parser.evaluate('{ name "test" }')).toThrow('Invalid object literal')
    expect(() => parser.evaluate('{ name: }')).toThrow('Invalid object literal')
  })
  it('unary operators', () => {
    const parser = createParser();

    // Logical NOT operator
    expect(parser.evaluate('!true')).toBe(false)
    expect(parser.evaluate('!false')).toBe(true)
    expect(parser.evaluate('!!true')).toBe(true)
    expect(parser.evaluate('!!false')).toBe(false)
    expect(parser.evaluate('!!!true')).toBe(false)

    // Unary negation operator
    expect(parser.evaluate('-5')).toBe(-5)
    expect(parser.evaluate('-(-5)')).toBe(5)
    expect(parser.evaluate('--5')).toBe(5)
    expect(parser.evaluate('---5')).toBe(-5)
    expect(parser.evaluate('-0')).toBe(-0)
    expect(parser.evaluate('-x', { x: 10 })).toBe(-10)
    expect(parser.evaluate('-(2 + 3)')).toBe(-5)

    // Combined unary operators
    expect(parser.evaluate('!-1')).toBe(false) // !(−1) → !true → false
    expect(parser.evaluate('-!true')).toBe(-0) // −(!true) → −false → −0
    expect(parser.evaluate('!-0')).toBe(true)  // !(−0) → !false → true

    // Unary operators with expressions
    expect(parser.evaluate('-(5 + 3) * 2')).toBe(-16) // −(5+3) * 2 → −8 * 2 → −16
    expect(parser.evaluate('!(5 > 3) and true')).toBe(false) // !(5>3) and true → !true and true → false and true → false
    expect(parser.evaluate('!(5 > 3) or true')).toBe(true)   // !(5>3) or true → !true or true → false or true → true

    // Unary operators with variables
    expect(parser.evaluate('!isTrue', { isTrue: true })).toBe(false)
    expect(parser.evaluate('!isTrue', { isTrue: false })).toBe(true)
    expect(parser.evaluate('-num', { num: 42 })).toBe(-42)

    // Precedence tests
    expect(parser.evaluate('-5 + 3')).toBe(-2)  // −5 + 3 → −2
    expect(parser.evaluate('-(5 + 3)')).toBe(-8) // −(5+3) → −8
    expect(parser.evaluate('!false and true')).toBe(true) // (!false) and true → true and true → true
    expect(parser.evaluate('!(false and true)')).toBe(true) // !(false and true) → !(false) → true
  })
  it('unary operator edge cases', () => {
    const parser = createParser();

    // Unary operators with different data types
    expect(parser.evaluate('!"hello"')).toBe(false) // !"hello" → !true → false
    expect(parser.evaluate('!""')).toBe(true)       // !"" → !false → true
    expect(parser.evaluate('!0')).toBe(true)        // !0 → !false → true
    expect(parser.evaluate('!1')).toBe(false)       // !1 → !true → false

    // Unary negation with different data types
    expect(parser.evaluate('-true')).toBe(-1)       // −true → −1
    expect(parser.evaluate('-false')).toBe(-0)      // −false → −0
    expect(parser.evaluate('-"5"')).toBe(-5)        // −"5" → −5

    // Arrays and objects (should work with truthy/falsy values)
    expect(parser.evaluate('![1,2,3]')).toBe(false) // ![1,2,3] → !true → false
    expect(parser.evaluate('![]')).toBe(false)      // ![] → !true → false (empty array is truthy in JS)
  })
  it('undefined variable throws error', () => {
    const parser = createParser();

    // Variable not provided in variables map
    expect(() => parser.evaluate('unknownVar')).toThrow('No value provided for variable unknownVar')

    // Variable in expression
    expect(() => parser.evaluate('5 + unknownVar')).toThrow('No value provided for variable unknownVar')

    // Function getter that returns undefined
    expect(() => parser.evaluate('getUndefined', {
      getUndefined: () => undefined
    })).toThrow('No value provided for variable getUndefined')
  })
  it('function getter variables', () => {
    const parser = createParser();

    // Basic function getter that returns a constant
    expect(parser.evaluate('dynamicValue', {
      dynamicValue: () => 42
    })).toBe(42)

    // Function getter that returns a string
    expect(parser.evaluate('getMessage', {
      getMessage: () => 'Hello, World!'
    })).toBe('Hello, World!')

    // Function getter used in arithmetic
    expect(parser.evaluate('getValue + 10', {
      getValue: () => 5
    })).toBe(15)

    // Function getter used with operators
    expect(parser.evaluate('getPrice * 2', {
      getPrice: () => 100
    })).toBe(200)

    // Multiple function getters in one expression
    expect(parser.evaluate('getX + getY', {
      getX: () => 10,
      getY: () => 20
    })).toBe(30)

    // Function getter that returns boolean
    expect(parser.evaluate('isActive and true', {
      isActive: () => true
    })).toBe(true)

    expect(parser.evaluate('isDisabled or false', {
      isDisabled: () => false
    })).toBe(false)

    // Function getter that returns an array
    expect(parser.evaluate('getArray', {
      getArray: () => [1, 2, 3, 4]
    })).toEqual([1, 2, 3, 4])

    // Function getter that returns an object
    expect(parser.evaluate('getUser', {
      getUser: () => ({ name: 'John', age: 30 })
    })).toEqual({ name: 'John', age: 30 })

    // Function getter used in comparisons
    expect(parser.evaluate('getScore > 50', {
      getScore: () => 75
    })).toBe(true)

    expect(parser.evaluate('getCount == 0', {
      getCount: () => 0
    })).toBe(true)

    // Function getter with unary operators
    expect(parser.evaluate('!getFlag', {
      getFlag: () => false
    })).toBe(true)

    expect(parser.evaluate('-getNumber', {
      getNumber: () => 42
    })).toBe(-42)

    // Function getter in complex expression
    expect(parser.evaluate('(getA + getB) * 2 - getC', {
      getA: () => 5,
      getB: () => 10,
      getC: () => 5
    })).toBe(25)

    // Function getter mixed with regular variables
    expect(parser.evaluate('staticVar + dynamicFunc', {
      staticVar: 100,
      dynamicFunc: () => 50
    })).toBe(150)
  })
});
