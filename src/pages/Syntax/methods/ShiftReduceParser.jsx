import React, { useState } from 'react';
import { ArrowLeft, Play, RotateCcw, Eraser, Zap, ListChecks, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './ShiftReduceParser.css';

const ShiftReduceParser = () => {
    const examples = [
        {
            name: "Basic Arithmetic",
            grammar: "E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id",
            input: "id * ( id + id )"
        },
        {
            name: "Simple Addition",
            grammar: "E -> E + E | id",
            input: "id + id + id"
        }
    ];

    const [grammarText, setGrammarText] = useState(examples[0].grammar);
    const [inputText, setInputText] = useState(examples[0].input);
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'simulation'
    const [trace, setTrace] = useState([]);
    const [error, setError] = useState("");

    const handleCompute = () => {
        try {
            setError("");
            const rules = parseGrammar(grammarText);
            if (rules.length === 0) throw new Error("Invalid grammar format.");

            const result = performShiftReduce(rules, inputText);
            setTrace(result);
            setActiveStage('simulation');
        } catch (err) {
            setError(err.message);
        }
    };

    const parseGrammar = (text) => {
        const rules = [];
        const lines = text.split('\n').filter(l => l.trim() !== '');
        lines.forEach(line => {
            const [lhs, rhsPart] = line.split('->').map(s => s.trim());
            if (!lhs || !rhsPart) return;
            const alternatives = rhsPart.split('|').map(alt => alt.trim().split(/\s+/));
            alternatives.forEach(alt => {
                rules.push({ lhs, rhs: alt });
            });
        });
        return rules;
    };

    const computeFirstFollow = (rules) => {
        const nonTerminals = new Set(rules.map(r => r.lhs));
        const first = {};
        const follow = {};
        nonTerminals.forEach(nt => {
            first[nt] = new Set();
            follow[nt] = new Set();
        });

        const getFirstOfSequence = (seq) => {
            const result = new Set();
            let allHaveEpsilon = true;
            for (const symbol of seq) {
                if (!nonTerminals.has(symbol)) {
                    if (symbol !== 'ε') result.add(symbol);
                    allHaveEpsilon = false;
                    break;
                }
                const f = first[symbol];
                f.forEach(val => {
                    if (val !== 'ε') result.add(val);
                });
                if (!f.has('ε')) {
                    allHaveEpsilon = false;
                    break;
                }
            }
            if (allHaveEpsilon) result.add('ε');
            return result;
        };

        let changed = true;
        while (changed) {
            changed = false;
            for (const rule of rules) {
                const result = getFirstOfSequence(rule.rhs);
                const sizeBefore = first[rule.lhs].size;
                result.forEach(val => first[rule.lhs].add(val));
                if (first[rule.lhs].size > sizeBefore) changed = true;
            }
        }

        if (rules.length > 0) follow[rules[0].lhs].add('$');
        changed = true;
        while (changed) {
            changed = false;
            for (const rule of rules) {
                for (let i = 0; i < rule.rhs.length; i++) {
                    const B = rule.rhs[i];
                    if (nonTerminals.has(B)) {
                        const beta = rule.rhs.slice(i + 1);
                        const firstBeta = getFirstOfSequence(beta);
                        const sizeBefore = follow[B].size;

                        firstBeta.forEach(val => {
                            if (val !== 'ε') follow[B].add(val);
                        });

                        if (beta.length === 0 || firstBeta.has('ε')) {
                            follow[rule.lhs].forEach(val => follow[B].add(val));
                        }

                        if (follow[B].size > sizeBefore) changed = true;
                    }
                }
            }
        }
        return { nonTerminals, first, follow };
    };

    const performShiftReduce = (rules, inputStr) => {
        const { follow } = computeFirstFollow(rules);
        const tokens = inputStr.trim().split(/\s+/).filter(t => t !== '');
        tokens.push('$');
        let stack = ['$'];
        let pointer = 0;
        const trace = [];

        trace.push({
            stack: stack.join(' '),
            input: tokens.slice(pointer).join(' '),
            action: 'Initial'
        });

        let steps = 0;
        while (steps < 200) {
            steps++;
            const currentStack = stack.join(' ');
            const currentInput = tokens.slice(pointer).join(' ');
            const lookahead = pointer < tokens.length ? tokens[pointer] : null;

            // Try to Reduce
            let reduced = false;
            // Always try the longest RHS match first (greedy reduction)
            const sortedRules = [...rules].sort((a, b) => b.rhs.length - a.rhs.length);

            for (const rule of sortedRules) {
                const rhsStr = rule.rhs.join(' ');
                const stackTail = stack.slice(-rule.rhs.length).join(' ');

                if (rhsStr === stackTail && rhsStr !== 'ε') {
                    // Check SLR(1) condition
                    if (lookahead && !follow[rule.lhs]?.has(lookahead)) {
                        continue; // Cannot reduce due to lookahead
                    }

                    // Match found
                    const action = `Reduce ${rule.lhs} -> ${rhsStr}`;
                    stack.splice(-rule.rhs.length, rule.rhs.length, rule.lhs);
                    trace.push({
                        stack: stack.join(' '),
                        input: tokens.slice(pointer).join(' '),
                        action: action
                    });
                    reduced = true;
                    break;
                }
            }

            if (reduced) continue;

            // Try to Shift
            if (pointer < tokens.length) {
                const token = tokens[pointer];
                if (token === '$') {
                    // Check if accepted
                    if (stack.length === 2 && stack[1] === rules[0].lhs && stack[0] === '$') {
                        trace.push({
                            stack: stack.join(' '),
                            input: '$',
                            action: 'Accept'
                        });
                        break;
                    } else {
                        // Dead end
                        trace.push({
                            stack: stack.join(' '),
                            input: '$',
                            action: 'Error: Cannot reduce further',
                            error: true
                        });
                        break;
                    }
                }

                stack.push(token);
                pointer++;
                trace.push({
                    stack: stack.join(' '),
                    input: tokens.slice(pointer).join(' '),
                    action: `Shift` // Updated to just 'Shift' to match user's image, previously it was 'Shift ${token}'
                });
            } else {
                break;
            }
        }

        return trace;
    };

    const handleClear = () => {
        setGrammarText("");
        setInputText("");
        setTrace([]);
        setActiveStage('config');
        setError("");
    };

    const loadExample = () => {
        const nextIdx = (examples.findIndex(e => e.grammar === grammarText) + 1) % examples.length;
        setGrammarText(examples[nextIdx].grammar);
        setInputText(examples[nextIdx].input);
        setActiveStage('config');
        setTrace([]);
    };

    return (
        <div className="sr-unit-container">
            <div className="sr-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="sr-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <ListChecks size={28} className="sr-header-icon" />
                    Shift-Reduce Parser
                </motion.h2>
                <p>A bottom-up parsing technique that uses a stack to hold symbols and an input buffer for tokens.</p>
            </div>

            <div className="sr-main-grid">
                <div className="sr-rc-panel mb-10">
                    <div className="sr-rc-input-group">
                        <div className="sr-panel-header mb-4">
                            <h3><Zap size={20} className="text-indigo-400" /> Grammar Rules</h3>
                            <button className="sr-btn-sm" onClick={loadExample}>Example Change</button>
                        </div>
                        <textarea
                            className="sr-main-input"
                            value={grammarText}
                            onChange={(e) => setGrammarText(e.target.value)}
                            disabled={activeStage !== 'config'}
                            placeholder="E -> E + T | T"
                        />
                    </div>

                    <div className="sr-rc-input-group mt-6">
                        <div className="sr-panel-header mb-4">
                            <h3><ListChecks size={20} className="text-indigo-400" /> Input String</h3>
                        </div>
                        <input
                            type="text"
                            className="sr-main-input"
                            style={{ minHeight: 'auto' }}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={activeStage !== 'config'}
                            placeholder="id + id * id"
                        />
                        {error && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
                                <Info size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <div className="sr-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="sr-btn sr-btn-primary" onClick={handleCompute}>
                                <Play size={18} /> Start Simulation
                            </button>
                        ) : (
                            <button className="sr-btn sr-btn-secondary" onClick={() => setActiveStage('config')}>
                                <RotateCcw size={18} /> Edit Grammar
                            </button>
                        )}
                        <button className="sr-btn sr-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Input
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'simulation' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="sr-journey-stack"
                        >
                            <div className="sr-trace-card">
                                <div className="sr-stage-header mb-6">
                                    <div className="sr-stage-title">
                                        <ListChecks size={24} className="text-indigo-400" />
                                        <h3>Parsing Trace</h3>
                                    </div>
                                    <div className={`sr-badge ${trace[trace.length - 1]?.action === 'Accept' ? 'success' : 'error-badge'}`}>
                                        {trace[trace.length - 1]?.action === 'Accept' ? 'Accepted' : 'Failed'}
                                    </div>
                                </div>
                                <div className="sr-scroll-area">
                                    <table className="sr-table">
                                        <thead>
                                            <tr>
                                                <th>Step</th>
                                                <th>Stack</th>
                                                <th>Input Buffer</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trace.map((step, i) => (
                                                <motion.tr
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={step.action === 'Accept' ? 'sr-accept-row' : step.error ? 'sr-error-row' : ''}
                                                >
                                                    <td>{i + 1}</td>
                                                    <td className="sr-mono">{step.stack}</td>
                                                    <td className="sr-mono">{step.input}</td>
                                                    <td className={step.action.startsWith('Shift') ? 'text-indigo-400' : step.action.startsWith('Reduce') ? 'text-emerald-400' : ''}>
                                                        {step.action}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                        
                                    </table>
                                </div>
                                
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="sr-definition-card mt-12 bg-gray-900/80 border border-gray-700/50 p-6 rounded-2xl"
                            >
                                <h4 className="text-white mb- font-semibold flex items-center gap-2 text-lg">
                                    <Info size={18} className="text-indigo-400" /> Computation Notes
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 text-base">
                                    <li><strong>Shift:</strong> Moves the next input token onto the stack.</li>
                                    <li><strong>Reduce:</strong> Replaces a sequence of symbols on top of the stack with a non-terminal if they match the RHS of a rule.</li>
                                    <li><strong>Accept:</strong> Successful completion when the stack contains only the start symbol and the input is empty.</li>
                                    <li><strong>Handle:</strong> The sequence of symbols on the stack that matches a RHS and is chosen for reduction.</li>
                                </ul>
                            </motion.div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="sr-bottom-spacer" />
        </div>
    );
};

export default ShiftReduceParser;
