export interface ParserState {
  tokens: string[];
  currentTokenIndex: number;
  currentToken: string;
  nextToken: () => void;
  variables: VariableMap;
}

type ValueType = number | string | boolean | any[] | object;
export type VariableMap = { [key: string]: ValueType };
export type FunctionMap = { [key: string]: (state: ParserState, ...args: any[]) => any };
export type OperatorMap = { [key: string]: (a: any, b: any) => any };
export type UnaryOperatorMap = { [key: string]: (value: any) => any };
export type PrecedenceMap = { [operator: string]: number };
export type ExpressionParserConstructor = {
  variables?: VariableMap,
  regex?: RegExp,
  operatorPrecedence?: PrecedenceMap,
  unaryOperators?: UnaryOperatorMap,
}


const comparisonOperatorRegex = /([<>]=|==|!=)/;
const specialCharacterRegex = /([-+*/():,<>!=%^\[\]\{\}])/;
const numberRegex = /\b(?:\d+(\.\d+)?)/;
const stringRegex = /(?:"[^"]*")|(?:'[^']*')/;
const identifierRegex = /(?:\w+(?:\.\w+)*(?:\[\d+\])*|(?:\.\.\.\w+))/

export class ExpressionParser {
  variables: VariableMap = {};
  functions: FunctionMap = {};
  operators: OperatorMap = {};
  unaryOperators: UnaryOperatorMap = {};
  operatorPrecedence: PrecedenceMap = {};
  regex: RegExp;

  constructor({
    variables,
    regex,
    operatorPrecedence,
    unaryOperators
  }: ExpressionParserConstructor = {}) {
    let regexString = comparisonOperatorRegex.source +
      '|' +
      specialCharacterRegex.source +
      '|' +
      numberRegex.source +
      '|' +
      stringRegex.source +
      '|' +
      identifierRegex.source;

    if (regex) {
      regexString += '|' + regex.source;
    }
    this.regex = new RegExp(regexString,
      'g'
    );
    this.variables = {
      ...this.variables,
      ...(variables || {})
    }
    this.operatorPrecedence = {
      ...this.operatorPrecedence,
      ...(operatorPrecedence || {})
    }
    this.unaryOperators = {
      ...this.unaryOperators,
      ...(unaryOperators || {})
    }
  }

  private tokenize(expression: string): string[] {
    return expression.match(this.regex) || [];
  }

  private parseNumber(state: ParserState): number {
    const token = state.currentToken;
    if (token === undefined || isNaN(Number(token))) {
      throw new Error('Invalid expression');
    }

    state.nextToken();
    return parseFloat(token);
  }

  private parseString(state: ParserState, tickType: string): string {
    const token = state.currentToken;
    if (token === undefined || !token.startsWith(tickType) || !token.endsWith(tickType)) {
      throw new Error('Invalid expression');
    }

    state.nextToken();
    return token.slice(1, -1);
  }

  private parseBoolean(state: ParserState): boolean {
    const token = state.currentToken;
    if (token === undefined || (token !== 'true' && token !== 'false')) {
      throw new Error('Invalid expression');
    }

    state.nextToken();
    return token === 'true';
  }

  private parseArray(state: ParserState): any[] {
    state.nextToken();
    const array: any[] = [];

    while (state.currentToken !== ']') {
      array.push(this.parseExpression(state));

      if (state.currentToken === ',') {
        state.nextToken();
      } else if (state.currentToken !== ']') {
        throw new Error('Invalid expression');
      }
    }

    if (state.currentToken !== ']') {
      throw new Error('Invalid expression');
    }

    state.nextToken();
    return array;
  }

  private parseUnaryFactor(state: ParserState): any {
    const token = state.currentToken;

    if (token && this.unaryOperators.hasOwnProperty(token)) {
      const unaryOperator = this.unaryOperators[token];
      state.nextToken();
      const factor = this.parseUnaryFactor(state);
      return unaryOperator(factor);
    }

    return this.parseFactor(state);
  }

  private parseObject(state: ParserState): object {
    const obj: { [key: string]: any } = {};
    while (true) {
      const key = state.currentToken;
      if (typeof key !== 'string') {
        throw new Error('Invalid object literal');
      }

      if (key.includes('...')) {
        state.currentToken = state.currentToken.replace('...', '')
        Object.assign(obj, this.parseExpression(state))
      } else {
        state.nextToken();
        if (state.currentToken !== ':') {
          throw new Error('Invalid object literal');
        }

        state.nextToken();

        const value = this.parseExpression(state);
        obj[key] = value;
      }
      if (state.currentToken as any === '}') {
        break;
      }

      if (state.currentToken as any !== ',') {
        throw new Error('Invalid object literal');
      }

      state.nextToken();
    }

    if (state.currentToken as any !== '}') {
      throw new Error('Invalid object literal');
    }

    state.nextToken();

    return obj;
  }

  private parseFunction(state: ParserState): any {
    const token = state.currentToken;
    const func = this.functions[token]
    state.nextToken();

    if (state.currentToken !== '(') {
      throw new Error('Invalid expression');
    }

    state.nextToken();

    const args: any[] = [];
    while (state.currentToken as any !== ')') {
      args.push(this.parseExpression(state));

      if (state.currentToken as any === ',') {
        state.nextToken();
      }
    }

    if (state.currentToken as any !== ')') {
      throw new Error('Invalid expression');
    }

    state.nextToken();

    return func(state, ...args);
  }

  private parseFactor(state: ParserState): ValueType {
    let value: ValueType = 0;
    const token = state.currentToken;

    if (token === undefined) {
      throw new Error('Invalid expression');
    }
    if (token === '(') {
      state.nextToken();
      value = this.parseExpression(state);

      if (state.currentToken !== ')') {
        throw new Error('Invalid expression');
      }

      state.nextToken();
    } else if (!isNaN(Number(token))) {
      value = this.parseNumber(state);
    } else if (token.startsWith('"') && token.endsWith('"')) {
      value = this.parseString(state, '"');
    } else if (token.startsWith('\'') && token.endsWith('\'')) {
      value = this.parseString(state, '\'');
    } else if (token === 'true' || token === 'false') {
      value = this.parseBoolean(state);
    } else if (token === '[') {
      value = this.parseArray(state);
    } else if (token === '{') {
      state.nextToken()
      value = this.parseObject(state);
    } else if (token.includes('.')) {
      const objectPath = token.split('.');
      let objectValue = state.variables as any
      for (const path of objectPath) {
        if (typeof objectValue !== 'object' || objectValue === null || !objectValue.hasOwnProperty(path)) {
          objectValue = null as any;
          break;
        } else {
          objectValue = objectValue[path];
        }
      }

      value = objectValue;
      state.nextToken();
    } else if (this.functions.hasOwnProperty(token)) {
      value = this.parseFunction(state);
    } else if (this.operators.hasOwnProperty(token)) {
      throw new Error('Invalid expression');
      // const operator = this.operators[token];
      // state.nextToken();

      // const factor = this.parseFactor(state);
      // value = operator(0, factor);
    } else {
      // } else if (state.variables.hasOwnProperty(token)) {
      value = state.variables[token];
      state.nextToken();
    }

    return value;
  }

  private parseTerm(state: ParserState): number {
    let value = this.parseUnaryFactor(state) as any;

    return value;
  }

  private parseExpression(state: ParserState, minPrecedence: number = 0): any {
    let left = this.parseTerm(state);

    while (state.currentToken &&
           state.currentToken in this.operators &&
           this.getPrecedence(state.currentToken) >= minPrecedence) {

      const operator = state.currentToken;
      const precedence = this.getPrecedence(operator);
      state.nextToken();

      // Recursive call with higher precedence for right-associative
      const right = this.parseExpression(state, precedence + 1);

      left = this.operators[operator](left, right);
    }

    return left;
  }

  public evaluate(
    expression: string,
    variables?: VariableMap,
  ): any {
    const tempVariables = { ...this.variables, ...(variables || {}) };
    const state: ParserState = {
      tokens: this.tokenize(expression),
      currentTokenIndex: 0,
      get currentToken() {
        return this.tokens[this.currentTokenIndex];
      },
      set currentToken(value) {
        this.tokens[this.currentTokenIndex] = value
      },
      nextToken() {
        this.currentTokenIndex++;
      },
      variables: tempVariables,
    };
    const result = this.parseExpression(state);

    if (state.currentToken !== undefined) {
      throw new Error('Invalid expression');
    }

    return result;
  }

  public setFunctions(functions: FunctionMap): void {
    this.functions = {
      ...this.functions,
      ...functions
    };
  }

  public setOperators(operators: OperatorMap): void {
    this.operators = {
      ...this.operators,
      ...operators
    };
  }

  public setUnaryOperators(unaryOperators: UnaryOperatorMap): void {
    this.unaryOperators = {
      ...this.unaryOperators,
      ...unaryOperators
    };
  }

  public setOperatorPrecedence(precedence: PrecedenceMap): void {
    this.operatorPrecedence = {
      ...this.operatorPrecedence,
      ...precedence
    };
  }

  private getPrecedence(operator: string): number {
    return this.operatorPrecedence[operator] || 0;
  }
}

export default ExpressionParser;
