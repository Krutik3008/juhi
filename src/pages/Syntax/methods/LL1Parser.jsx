import React, { useState, useEffect } from 'react';
import { ArrowLeft, Network, Play, RotateCcw, Eraser, Zap, ListChecks, Sparkles, Binary, Settings2, AlertCircle, Table2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './LL1Parser.css';

// --- LL(1) Computation Logic ---

/**
 * Basic grammar parser
 */
function parseGrammar(text) {
    const rules = [];
    const lines = text.split('\n').filter(l => l.trim() !== '');
    lines.forEach(line => {
        const [lhs, rhsPart] = line.split('->').map(s => s.trim());
        if (!lhs || !rhsPart) return;
        const alternatives = rhsPart.split('|').map(alt => alt.trim().split(/\s+/));
        rules.push({ lhs, alternatives });
    });
    return rules;
}

/**
 * Step 1: Remove Immediate Left Recursion
 */
function removeLeftRecursion(rules) {
    const newRules = [];
    let changed = false;

    rules.forEach(rule => {
        const recursive = rule.alternatives.filter(alt => alt[0] === rule.lhs);
        const nonRecursive = rule.alternatives.filter(alt => alt[0] !== rule.lhs);

        if (recursive.length > 0) {
            changed = true;
            const newLhs = `${rule.lhs}'`;
            // A -> β A'
            const updatedOriginal = nonRecursive.map(alt => (alt[0] === 'ε' ? [newLhs] : [...alt, newLhs]));
            newRules.push({ lhs: rule.lhs, alternatives: updatedOriginal });
            // A' -> α A' | ε
            const updatedRecursive = recursive.map(alt => [...alt.slice(1), newLhs]);
            updatedRecursive.push(['ε']);
            newRules.push({ lhs: newLhs, alternatives: updatedRecursive });
        } else {
            newRules.push(rule);
        }
    });

    return { rules: newRules, changed };
}

/**
 * Step 2: Simple Left Factoring (First level highlight)
 */
function performLeftFactoring(rules) {
    // For educational purposes, we detect common prefixes
    const newRules = [];
    let changed = false;

    rules.forEach(rule => {
        const prefixes = {};
        rule.alternatives.forEach(alt => {
            const first = alt[0];
            if (!prefixes[first]) prefixes[first] = [];
            prefixes[first].push(alt);
        });

        const factored = [];
        let ruleChanged = false;

        Object.keys(prefixes).forEach(first => {
            if (prefixes[first].length > 1 && first !== 'ε') {
                changed = true;
                ruleChanged = true;
                const newLhs = `${rule.lhs}_alt`;
                factored.push([first, newLhs]);

                const suffixes = prefixes[first].map(alt => alt.length > 1 ? alt.slice(1) : ['ε']);
                newRules.push({ lhs: newLhs, alternatives: suffixes });
            } else {
                prefixes[first].forEach(alt => factored.push(alt));
            }
        });

        if (ruleChanged) {
            newRules.push({ lhs: rule.lhs, alternatives: factored });
        } else {
            newRules.push(rule);
        }
    });

    return { rules: newRules, changed };
}

/**
 * Step 3: Compute FIRST and FOLLOW
 */
function computeFirstFollow(rules, startSymbol) {
    const first = {};
    const follow = {};
    const nonTerminals = rules.map(r => r.lhs);
    const rulesMap = {};
    rules.forEach(r => rulesMap[r.lhs] = r.alternatives);

    nonTerminals.forEach(nt => { first[nt] = new Set(); follow[nt] = new Set(); });

    let changed = true;
    while (changed) {
        changed = false;
        rules.forEach(rule => {
            rule.alternatives.forEach(alt => {
                const beforeSize = first[rule.lhs].size;

                let allEpsilon = true;
                for (const symbol of alt) {
                    if (!nonTerminals.includes(symbol)) {
                        first[rule.lhs].add(symbol);
                        allEpsilon = false;
                        break;
                    } else {
                        const symbolFirst = first[symbol];
                        symbolFirst.forEach(s => { if (s !== 'ε') first[rule.lhs].add(s); });
                        if (!symbolFirst.has('ε')) {
                            allEpsilon = false;
                            break;
                        }
                    }
                }
                if (allEpsilon) first[rule.lhs].add('ε');

                if (first[rule.lhs].size !== beforeSize) changed = true;
            });
        });
    }

    if (startSymbol && follow[startSymbol]) {
        follow[startSymbol].add('$');
    } else if (rules.length > 0) {
        follow[rules[0].lhs].add('$');
    }
    changed = true;
    while (changed) {
        changed = false;
        rules.forEach(rule => {
            rule.alternatives.forEach(alt => {
                for (let i = 0; i < alt.length; i++) {
                    const B = alt[i];
                    if (nonTerminals.includes(B)) {
                        const beforeSize = follow[B].size;

                        // Rule: A -> α B β => First(β) in Follow(B)
                        let allEpsilon = true;
                        for (let j = i + 1; j < alt.length; j++) {
                            const symbol = alt[j];
                            if (!nonTerminals.includes(symbol)) {
                                follow[B].add(symbol);
                                allEpsilon = false;
                                break;
                            } else {
                                first[symbol].forEach(s => { if (s !== 'ε') follow[B].add(s); });
                                if (!first[symbol].has('ε')) {
                                    allEpsilon = false;
                                    break;
                                }
                            }
                        }

                        // Rule: A -> α B or A -> α B β (where β -> ε) => Follow(A) in Follow(B)
                        if (allEpsilon) {
                            follow[rule.lhs].forEach(s => follow[B].add(s));
                        }

                        if (follow[B].size !== beforeSize) changed = true;
                    }
                }
            });
        });
    }

    return { first, follow };
}

/**
 * Step 4: Construct Parsing Table
 */
function constructTable(rules, first, follow) {
    const table = {};
    const nonTerminals = rules.map(r => r.lhs);
    const terminals = new Set();
    let isLL1 = true;

    rules.forEach(r => {
        r.alternatives.forEach(alt => {
            alt.forEach(s => {
                if (!nonTerminals.includes(s) && s !== 'ε') terminals.add(s);
            });
        });
    });
    terminals.add('$');

    nonTerminals.forEach(nt => {
        table[nt] = {};
        terminals.forEach(t => table[nt][t] = []);
    });

    rules.forEach(rule => {
        rule.alternatives.forEach(alt => {
            // Find First(alt)
            const firstAlt = new Set();
            let allEpsilon = true;
            for (const sym of alt) {
                if (!nonTerminals.includes(sym)) {
                    if (sym !== 'ε') firstAlt.add(sym);
                    allEpsilon = (sym === 'ε');
                    break;
                } else {
                    first[sym].forEach(s => { if (s !== 'ε') firstAlt.add(s); });
                    if (!first[sym].has('ε')) {
                        allEpsilon = false;
                        break;
                    }
                }
            }

            firstAlt.forEach(t => {
                const prod = `${rule.lhs} -> ${alt.join(' ')}`;
                if (!table[rule.lhs][t].includes(prod)) {
                    table[rule.lhs][t].push(prod);
                    if (table[rule.lhs][t].length > 1) isLL1 = false;
                }
            });

            if (allEpsilon) {
                follow[rule.lhs].forEach(t => {
                    const prod = `${rule.lhs} -> ${alt.join(' ')}`;
                    if (!table[rule.lhs][t].includes(prod)) {
                        table[rule.lhs][t].push(prod);
                        if (table[rule.lhs][t].length > 1) isLL1 = false;
                    }
                });
            }
        });
    });

    // Convert arrays to strings for display
    const finalTable = {};
    nonTerminals.forEach(nt => {
        finalTable[nt] = {};
        terminals.forEach(t => {
            finalTable[nt][t] = table[nt][t].length > 0 ? table[nt][t].join(' | ') : null;
        });
    });

    return { table: finalTable, terminals: Array.from(terminals), isLL1 };
}

// --- Component ---

const LL1Parser = () => {
    const examples = [
        {
            name: "Arithmetic Expressions",
            grammar: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
            input: "id + id * id"
        },
        {
            name: "Recursive A",
            grammar: "S -> a S | b",
            input: "a a b"
        },
        {
            name: "Left Factoring Need",
            grammar: "A -> a b | a c | d",
            input: "a b"
        }
    ];

    const [grammarText, setGrammarText] = useState(examples[0].grammar);
    const [inputText, setInputText] = useState(examples[0].input);
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'steps'
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const [exampleIdx, setExampleIdx] = useState(0);
    const [visibleStage, setVisibleStage] = useState(0);

    useEffect(() => {
        let timer;
        if (activeStage === 'steps' && visibleStage < 5) {
            timer = setTimeout(() => {
                setVisibleStage(prev => prev + 1);
            }, visibleStage === 0 ? 300 : 1500);
        }
        return () => clearTimeout(timer);
    }, [activeStage, visibleStage]);



    const handleCompute = () => {
        try {
            setError("");
            const initialRules = parseGrammar(grammarText);
            if (initialRules.length === 0) throw new Error("Invalid grammar format");
            const startSymbol = initialRules[0].lhs;

            const step1 = removeLeftRecursion(initialRules);
            const step2 = performLeftFactoring(step1.rules);
            const finalRules = step2.rules;
            const { first, follow } = computeFirstFollow(finalRules, startSymbol);
            const { table, terminals, isLL1 } = constructTable(finalRules, first, follow);

            // Step 5: Parsing process
            const trace = [];
            const stack = ['$', startSymbol];
            const input = inputText.trim().split(/\s+/).filter(x => x !== '');
            input.push('$');
            let pointer = 0;
            let success = false;
            let stepsCount = 0;

            while (stepsCount < 100) {
                stepsCount++;
                const top = stack[stack.length - 1];
                const current = input[pointer];
                const stackStr = stack.join(' ');
                const inputStr = input.slice(pointer).join(' ');

                if (top === '$' && current === '$') {
                    trace.push({ stack: stackStr, input: inputStr, action: "Accepted" });
                    success = true;
                    break;
                }

                if (top === current) {
                    stack.pop();
                    pointer++;
                    trace.push({ stack: stackStr, input: inputStr, action: `Match ${current}`, match: true });
                } else if (table[top] && table[top][current]) {
                    const rule = table[top][current];
                    const rhs = rule.split('->')[1].trim().split(/\s+/);
                    stack.pop();
                    if (rhs[0] !== 'ε') {
                        for (let i = rhs.length - 1; i >= 0; i--) stack.push(rhs[i]);
                    }
                    trace.push({ stack: stackStr, input: inputStr, action: `Expand ${rule}` });
                } else {
                    const expected = table[top] ? Object.keys(table[top]).filter(t => table[top][t]) : [];
                    const actionMsg = expected.length > 0
                        ? `Error: Unexpected '${current}', expected ${expected.join(' or ')}`
                        : "Error: No entry in table";
                    trace.push({ stack: stackStr, input: inputStr, action: actionMsg, error: true });
                    break;
                }
            }

            setResults({
                initial: initialRules,
                noRecursion: step1.rules,
                factored: finalRules,
                first,
                follow,
                table,
                terminals,
                trace,
                success,
                startSymbol,
                isLL1
            });
            setActiveStage('steps');
            setVisibleStage(0);
        } catch (err) {
            setError(err.message);
        }
    };

    const loadExample = () => {
        const nextIdx = (exampleIdx + 1) % examples.length;
        setExampleIdx(nextIdx);
        setGrammarText(examples[nextIdx].grammar);
        setInputText(examples[nextIdx].input);
        setActiveStage('config');
        setResults(null);
    };

    const handleClear = () => {
        setGrammarText("");
        setInputText("");
        setResults(null);
        setActiveStage('config');
        setVisibleStage(0);
    };

    return (
        <div className="ll1-unit-container">
            <div className="ll1-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="ll1-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <Network size={28} className="ll1-header-icon" />
                    LL(1) Parser Simulation
                </motion.h2>
                <p>A top-down predictive parser that uses a parsing table to determine derivations. Enter a grammar to visualize all construction steps.</p>
            </div>

            <div className="ll1-main-grid">
                <div className="ll1-rc-panel mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="ll1-rc-input-group">
                            <div className="ll1-panel-header mb-4">
                                <h3><Zap size={20} className="text-indigo-400" /> Grammar Rules</h3>
                                <button className="ll1-btn-sm" onClick={loadExample}>Example Change</button>
                            </div>
                            <textarea
                                className="ll1-main-input"
                                value={grammarText}
                                onChange={(e) => setGrammarText(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="E -> T E'&#10;E' -> + T E' | ε"
                            />
                        </div>

                        <div className="ll1-rc-input-group">
                            <div className="ll1-panel-header mb-4">
                                <h3><Network size={20} className="text-indigo-400" /> Input String</h3>
                            </div>
                            <input
                                type="text"
                                className="ll1-main-input"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="e.g., id + id * id"
                            />
                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="ll1-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="ll1-btn ll1-btn-primary" onClick={handleCompute}>
                                <Play size={18} /> Start Simulation
                            </button>
                        ) : (
                            <button className="ll1-btn ll1-btn-secondary" onClick={() => setActiveStage('config')}>
                                <RotateCcw size={18} /> Edit Grammar
                            </button>
                        )}
                        <button className="ll1-btn ll1-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Input
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="ll1-journey-tracker mb-12">
                    <div className="ll1-phases-container">
                        {[
                            { id: 1, title: 'Left Recursion', desc: 'Remove recursion', stage: 'steps' },
                            { id: 2, title: 'Left Factoring', desc: 'Perform factoring', stage: 'steps' },
                            { id: 3, title: 'First & Follow', desc: 'Compute sets', stage: 'steps' },
                            { id: 4, title: 'Parsing Table', desc: 'Construct table', stage: 'steps' },
                            { id: 5, title: 'String Trace', desc: 'Parse input', stage: 'steps' }
                        ].map((phase, idx, arr) => {
                            const isActive = visibleStage === phase.id;
                            const isCompleted = visibleStage > phase.id;
                            return (
                                <React.Fragment key={phase.id}>
                                    <div
                                        className={`ll1-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                    >
                                        <div className="ll1-phase-num">{phase.id}</div>
                                        <div className="ll1-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && <span className={`ll1-phase-arrow ${isCompleted ? 'active' : ''}`}>→</span>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'steps' && results && (
                        <motion.div
                            className="ll1-journey-stack"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        staggerChildren: 0.15,
                                        delayChildren: 0.2
                                    }
                                }
                            }}
                        >
                            {/* Card Animation Variant */}
                            {(() => {
                                const cardVariants = {
                                    hidden: { opacity: 0, y: 30, scale: 0.98 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: { type: "spring", stiffness: 100, damping: 15 }
                                    }
                                };
                                return (
                                    <>
                                        {/* Step 1: Remove Left Recursion */}
                                        {visibleStage >= 1 && (
                                            <motion.div className="ll1-stage-card" variants={cardVariants} initial="hidden" animate="visible">
                                                <div className="ll1-stage-header">
                                                    <div className="ll1-stage-title"><Binary size={20} className="text-indigo-400" /><h3>1. Remove Left Recursion</h3></div>
                                                    <div className="ll1-badge success">Processed</div>
                                                </div>
                                                <div className="ll1-grammar-display">
                                                    {results.noRecursion.map((r, i) => (
                                                        <div key={i} className="ll1-grammar-rule">
                                                            <span className="nt">{r.lhs}</span>
                                                            <span className="arrow">→</span>
                                                            {r.alternatives.map((alt, ai) => (
                                                                <span key={ai}>
                                                                    <span className={alt[0] === 'ε' ? 'epsilon' : 'terminal'}>{alt.join(' ')}</span>
                                                                    {ai < r.alternatives.length - 1 && <span className="arrow"> | </span>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Step 2: Perform Left Factoring */}
                                        <AnimatePresence>
                                            {visibleStage >= 2 && (
                                                <motion.div className="ll1-stage-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                                                    <div className="ll1-stage-header">
                                                        <div className="ll1-stage-title"><Settings2 size={20} className="text-indigo-400" /><h3>2. Perform Left Factoring</h3></div>
                                                        <div className="ll1-badge success">Processed</div>
                                                    </div>
                                                    <div className="ll1-grammar-display">
                                                        {results.factored.map((r, i) => (
                                                            <div key={i} className="ll1-grammar-rule">
                                                                <span className="nt">{r.lhs}</span>
                                                                <span className="arrow">→</span>
                                                                {r.alternatives.map((alt, ai) => (
                                                                    <span key={ai}>
                                                                        <span className={alt[0] === 'ε' ? 'epsilon' : 'terminal'}>{alt.join(' ')}</span>
                                                                        {ai < r.alternatives.length - 1 && <span className="arrow"> | </span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Step 3: First & Follow */}
                                        <AnimatePresence>
                                            {visibleStage >= 3 && (
                                                <motion.div className="ll1-stage-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                                                    <div className="ll1-stage-header">
                                                        <div className="ll1-stage-title"><Sparkles size={20} className="text-indigo-400" /><h3>3. FIRST & FOLLOW Sets</h3></div>
                                                        <div className="ll1-badge success">Computed</div>
                                                    </div>
                                                    <div className="ll1-table-wrapper">
                                                        <table className="ll1-table">
                                                            <thead>
                                                                <tr><th>Non-Terminal</th><th>FIRST()</th><th>FOLLOW()</th></tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.keys(results.first).map(nt => (
                                                                    <tr key={nt}>
                                                                        <td className="nt-cell">{nt}</td>
                                                                        <td className="set-cell">{`{ ${Array.from(results.first[nt]).join(', ')} }`}</td>
                                                                        <td className="follow-cell">{`{ ${Array.from(results.follow[nt]).join(', ')} }`}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Step 4: Predictive Parsing Table */}
                                        <AnimatePresence>
                                            {visibleStage >= 4 && (
                                                <motion.div className="ll1-stage-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                                                    <div className="ll1-stage-header">
                                                        <div className="ll1-stage-title"><Table2 size={20} className="text-indigo-400" /><h3>4. Predictive Parsing Table</h3></div>
                                                        <div className="ll1-badge success">Complete</div>
                                                    </div>
                                                    <div className="ll1-table-wrapper">
                                                        <table className="ll1-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Non-Terminal</th>
                                                                    {results.terminals.map(t => <th key={t}>{t}</th>)}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.keys(results.table).map(nt => (
                                                                    <tr key={nt}>
                                                                        <td className="nt-cell">{nt}</td>
                                                                        {results.terminals.map(t => (
                                                                            <td key={t} className={results.table[nt][t] ? "prod-cell" : "empty-cell"}>
                                                                                {results.table[nt][t] || "-"}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Step 5: Parsing Trace */}
                                        <AnimatePresence>
                                            {visibleStage >= 5 && (
                                                <>
                                                    <motion.div className="ll1-trace-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                                                        <div className="ll1-stage-header">
                                                            <div className="ll1-stage-title"><ListChecks size={20} className="text-indigo-400" /><h3>5. Trace of Parsing String: "{inputText}"</h3></div>
                                                            <div className={results.success ? "ll1-badge success" : "ll1-badge error-badge"}>
                                                                {results.success ? "Accepted" : "Error"}
                                                            </div>
                                                        </div>
                                                        <div className="ll1-trace-wrapper">
                                                            <table className="ll1-trace-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Step</th>
                                                                        <th>Stack Content</th>
                                                                        <th>Input Buffer</th>
                                                                        <th>Action</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {results.trace.map((t, i) => (
                                                                        <motion.tr
                                                                            key={i}
                                                                            className={t.action === "Accepted" ? "accept-row" : t.match ? "match-row" : ""}
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: i * 0.08, duration: 0.3 }}
                                                                        >
                                                                            <td>{i + 1}</td>
                                                                            <td>{t.stack}</td>
                                                                            <td>{t.input}</td>
                                                                            <td className={t.error ? "text-red-400" : ""}>{t.action}</td>
                                                                        </motion.tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </motion.div>

                                                    <motion.div
                                                        className="ll1-stage-card"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.5 }}
                                                        style={{
                                                            background: 'rgba(99, 102, 241, 0.05)',
                                                            borderColor: 'rgba(99, 102, 241, 0.2)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '24px',
                                                            textAlign: 'center',
                                                            marginBottom: '50px'
                                                        }}
                                                    >
                                                        <div>
                                                            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                                                <span style={{ color: '#4f46e5' }}>✨</span> Main Parser Verdict
                                                            </h3>
                                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', margin: '0 0 6px 0' }}>
                                                                    Grammar Start Symbol: <strong style={{ color: '#818cf8' }}>{results.startSymbol}</strong>
                                                                </p>
                                                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', margin: '0 0 6px 0' }}>
                                                                    LL(1) Compatibility: <strong style={{ color: results.isLL1 ? '#4ade80' : '#f87171' }}>{results.isLL1 ? "LL(1) Valid" : "Conflicts Detected"}</strong>
                                                                </p>
                                                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', margin: '0' }}>
                                                                    Parsing String Result: <strong style={{ color: results.success ? '#4ade80' : '#f87171' }}>{results.success ? "Successfully Parsed ✓" : "Parsing Failed ✗"}</strong>
                                                                </p>
                                                            </div>
                                                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', margin: 0, maxWidth: '600px' }}>
                                                                {results.isLL1
                                                                    ? "The grammar is LL(1) compatible because each table cell has at most one production."
                                                                    : "The grammar is NOT LL(1) because one or more cells have multiple productions (conflicts). This leads to non-deterministic choices."}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="ll1-bottom-spacer" />
            </div>
        </div>
    );
};

export default LL1Parser;
