// Simple compiler engine that dynamically processes source code input
// through all 6 compilation phases

// ============ PHASE 1: Lexical Analysis ============
function tokenize(source) {
    const tokens = [];
    const lines = source.split('\n');

    for (const line of lines) {
        let i = 0;
        const s = line.trim();

        while (i < s.length) {
            // Skip whitespace
            if (/\s/.test(s[i])) { i++; continue; }

            // Numbers (int or float)
            if (/[0-9]/.test(s[i])) {
                let num = '';
                while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
                tokens.push({ lexeme: num, type: num.includes('.') ? 'Float Constant' : 'Constant' });
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(s[i])) {
                let id = '';
                while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { id += s[i]; i++; }
                const keywords = ['int', 'float', 'double', 'char', 'if', 'else', 'while', 'for', 'return', 'void'];
                if (keywords.includes(id)) {
                    tokens.push({ lexeme: id, type: 'Keyword' });
                } else {
                    tokens.push({ lexeme: id, type: 'Identifier' });
                }
                continue;
            }

            // Operators and punctuation
            const twoChar = s.substring(i, i + 2);
            const opMap2 = { '==': 'Equality Operator', '!=': 'Not Equal Operator', '<=': 'Less Equal Operator', '>=': 'Greater Equal Operator', '&&': 'Logical AND', '||': 'Logical OR' };
            if (opMap2[twoChar]) {
                tokens.push({ lexeme: twoChar, type: opMap2[twoChar] });
                i += 2; continue;
            }

            const opMap1 = {
                '=': 'Assignment Operator', '+': 'Addition Operator', '-': 'Subtraction Operator',
                '*': 'Multiplication Operator', '/': 'Division Operator', '%': 'Modulo Operator',
                '<': 'Less Than Operator', '>': 'Greater Than Operator',
                '(': 'Left Parenthesis', ')': 'Right Parenthesis',
                '{': 'Left Brace', '}': 'Right Brace',
                '[': 'Left Bracket', ']': 'Right Bracket',
                ';': 'Semicolon', ',': 'Comma', '.': 'Dot'
            };
            if (opMap1[s[i]]) {
                tokens.push({ lexeme: s[i], type: opMap1[s[i]] });
                i++; continue;
            }

            // Unknown
            tokens.push({ lexeme: s[i], type: 'Unknown' });
            i++;
        }
    }
    return tokens;
}

function buildTokenStream(tokens) {
    return tokens.map(t => {
        const shortType = {
            'Identifier': 'id', 'Constant': 'num', 'Float Constant': 'num',
            'Keyword': 'keyword', 'Assignment Operator': '=', 'Addition Operator': '+',
            'Subtraction Operator': '-', 'Multiplication Operator': '*', 'Division Operator': '/',
            'Semicolon': ';', 'Left Parenthesis': '(', 'Right Parenthesis': ')',
            'Comma': ',', 'Less Than Operator': '<', 'Greater Than Operator': '>',
        };
        const tag = shortType[t.type] || t.lexeme;
        if (['id', 'num', 'keyword'].includes(tag)) {
            return `<${tag}, ${t.lexeme}>`;
        }
        return `<${t.lexeme}>`;
    }).join('  ');
}

// ============ PHASE 2: Syntax Analysis (Parse Tree) ============
function buildParseTree(tokens) {
    const exprTokens = tokens.filter(t =>
        t.type !== 'Semicolon' && t.type !== 'Keyword'
    );

    const assignIdx = exprTokens.findIndex(t => t.type === 'Assignment Operator');

    let tree;
    if (assignIdx === -1) {
        tree = buildNode(exprTokens);
    } else {
        const lhs = exprTokens[assignIdx - 1]?.lexeme || '?';
        const rhsTokens = exprTokens.slice(assignIdx + 1);
        tree = { val: '=', left: { val: lhs }, right: buildNode(rhsTokens) };
    }

    return renderAsciiTree(tree);
}

function buildNode(tokens) {
    if (tokens.length === 0) return { val: '?' };
    if (tokens.length === 1) return { val: tokens[0].lexeme };

    let opIdx = -1;
    let lowestPrec = 999;

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        let prec = -1;
        if (t.type === 'Addition Operator' || t.type === 'Subtraction Operator') prec = 1;
        if (t.type === 'Multiplication Operator' || t.type === 'Division Operator') prec = 2;

        if (prec > 0 && prec <= lowestPrec) {
            lowestPrec = prec;
            opIdx = i;
        }
    }

    if (opIdx === -1) return { val: tokens.map(t => t.lexeme).join(' ') };

    return {
        val: tokens[opIdx].lexeme,
        left: buildNode(tokens.slice(0, opIdx)),
        right: buildNode(tokens.slice(opIdx + 1))
    };
}

function renderAsciiTree(node) {
    if (!node) return '';
    const lines = printDirTree(node);
    return lines.join('\n');
}

function printDirTree(node, prefix = "", isLeft = true, isRoot = true) {
    if (!node) return [];
    const lines = [];

    // Add current node
    if (isRoot) {
        lines.push(node.val);
    } else {
        lines.push(prefix + (isLeft ? "├── " : "└── ") + node.val);
    }

    // Determine prefix for children
    const newPrefix = isRoot ? "" : prefix + (isLeft ? "│   " : "    ");

    // Gather children
    const children = [];
    if (node.left) children.push({ n: node.left, left: !!node.right });
    if (node.right) children.push({ n: node.right, left: false });

    // Recursively add children
    for (const c of children) {
        lines.push(...printDirTree(c.n, newPrefix, c.left, false));
    }

    return lines;
}

// ============ PHASE 3: Semantic Analysis ============
function semanticAnalysis(tokens) {
    const identifiers = [];
    const seen = new Set();

    // Check if there's a type keyword
    const typeKeyword = tokens.find(t => t.type === 'Keyword' && ['int', 'float', 'double', 'char'].includes(t.lexeme));
    const declaredType = typeKeyword ? typeKeyword.lexeme : 'float';

    for (const t of tokens) {
        if (t.type === 'Identifier' && !seen.has(t.lexeme)) {
            seen.add(t.lexeme);
            identifiers.push({ name: t.lexeme, type: declaredType });
        }
    }

    return identifiers;
}

// ============ PHASE 4: Intermediate Code (Three-Address Code) ============
function generateTAC(tokens) {
    const exprTokens = tokens.filter(t =>
        t.type !== 'Semicolon' && t.type !== 'Keyword'
    );

    const assignIdx = exprTokens.findIndex(t => t.type === 'Assignment Operator');
    if (assignIdx === -1) return exprTokens.map(t => t.lexeme).join(' ');

    const lhs = exprTokens[assignIdx - 1]?.lexeme || '?';
    const rhsTokens = exprTokens.slice(assignIdx + 1);

    const tacLines = [];
    let tempCount = 1;

    const result = generateTACExpr(rhsTokens, tacLines, { count: tempCount });
    tacLines.push(`${lhs} = ${result}`);

    return tacLines.join('\n');
}

function generateTACExpr(tokens, lines, temp) {
    if (tokens.length === 1) return tokens[0].lexeme;
    if (tokens.length === 0) return '?';

    // Find lowest precedence operator
    let opIdx = -1;
    let lowestPrec = 999;

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        let prec = -1;
        if (t.type === 'Addition Operator' || t.type === 'Subtraction Operator') prec = 1;
        if (t.type === 'Multiplication Operator' || t.type === 'Division Operator') prec = 2;
        if (prec > 0 && prec <= lowestPrec) {
            lowestPrec = prec;
            opIdx = i;
        }
    }

    if (opIdx === -1) return tokens.map(t => t.lexeme).join(' ');

    const leftResult = generateTACExpr(tokens.slice(0, opIdx), lines, temp);
    const rightResult = generateTACExpr(tokens.slice(opIdx + 1), lines, temp);

    const tempVar = `t${temp.count++}`;
    lines.push(`${tempVar} = ${leftResult} ${tokens[opIdx].lexeme} ${rightResult}`);
    return tempVar;
}

// ============ PHASE 5: Code Optimization ============
function optimizeCode(tacCode) {
    const lines = tacCode.split('\n');
    if (lines.length <= 1) return tacCode;

    // Simple copy propagation: if last line is `x = tN` and previous defines tN, inline it
    const optimized = [...lines];

    // Try to eliminate simple copy assignments like `x = t2` where t2 = a + t1
    if (optimized.length >= 2) {
        const lastLine = optimized[optimized.length - 1];
        const match = lastLine.match(/^(\w+)\s*=\s*(t\d+)$/);
        if (match) {
            const [, target, tempVar] = match;
            // Find where tempVar is defined
            for (let i = 0; i < optimized.length - 1; i++) {
                if (optimized[i].startsWith(tempVar + ' = ')) {
                    const expr = optimized[i].substring(tempVar.length + 3);
                    optimized[i] = `${target} = ${expr}`;
                    optimized.pop(); // Remove the copy line
                    break;
                }
            }
        }
    }

    return optimized.join('\n');
}

// ============ PHASE 6: Code Generation (Assembly) ============
function generateAssembly(optimizedCode) {
    const lines = optimizedCode.split('\n');
    const asmLines = [];
    let regCount = 1;
    const varToReg = {};

    for (const line of lines) {
        const parts = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (!parts) continue;

        const [, dest, expr] = parts;

        // Check if it's a binary operation
        const binOp = expr.match(/^(\w+)\s*([+\-*/])\s*(\w+)$/);
        if (binOp) {
            const [, left, op, right] = binOp;
            const reg = `R${regCount++}`;

            // Load left operand
            if (varToReg[left]) {
                asmLines.push(`MOV   ${reg}, ${varToReg[left]}`);
            } else {
                asmLines.push(`LOAD  ${reg}, ${left}`);
            }

            // Apply operation
            const opNames = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV' };
            const rightOp = varToReg[right] || right;
            asmLines.push(`${opNames[op]}   ${reg}, ${rightOp}`);

            varToReg[dest] = reg;
        } else {
            // Simple assignment
            const srcReg = varToReg[expr.trim()];
            if (srcReg) {
                asmLines.push(`STORE ${dest}, ${srcReg}`);
                varToReg[dest] = srcReg;
            } else {
                const reg = `R${regCount++}`;
                asmLines.push(`LOAD  ${reg}, ${expr.trim()}`);
                varToReg[dest] = reg;
            }
        }
    }

    // Store final result if not already stored
    const lastLine = lines[lines.length - 1];
    const lastDest = lastLine?.match(/^(\w+)\s*=/)?.[1];
    if (lastDest && !lastDest.startsWith('t') && varToReg[lastDest]) {
        const lastAsm = asmLines[asmLines.length - 1];
        if (!lastAsm?.startsWith('STORE')) {
            asmLines.push(`STORE ${lastDest}, ${varToReg[lastDest]}`);
        }
    }

    return asmLines.join('\n');
}

// ============ Main compile function ============
export function compile(source) {
    const tokens = tokenize(source);
    const tokenStream = buildTokenStream(tokens);
    const parseTree = buildParseTree(tokens);
    const symbolTable = semanticAnalysis(tokens);
    const tac = generateTAC(tokens);
    const optimized = optimizeCode(tac);
    const assembly = generateAssembly(optimized);

    return {
        tokens,
        tokenStream,
        parseTree,
        symbolTable,
        tac,
        optimized,
        assembly
    };
}
