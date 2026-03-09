import React, { useState } from 'react';
import { Play, RotateCcw, Eraser, Zap, Network, Sparkles, ArrowLeft, AlignLeft, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './AmbiguityChecker.css';

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 40, nodesep: 30 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 60, height: 60 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        node.position = {
            x: nodePosition.x - 30,
            y: nodePosition.y - 30,
        };
    });

    return { nodes, edges };
};

const tokenizeItem = (str) => {
    if (str.trim() === 'epsilon' || str.trim() === 'ε' || str.trim() === '') return ['ε'];
    // Smarter tokenizer: split uppercase (likely non-terminals), id, digits, and single characters
    return str.match(/([A-Z]|id|epsilon|ε|\d+|[a-z]|[^\s\w])/g) || [];
};

function parseGrammar(grammarText) {
    const rules = {};
    let startSymbol = null;
    let nonTerminals = new Set();

    grammarText.split('\n').filter(line => line.includes('->')).forEach(line => {
        const [leftRaw, rightRaw] = line.split('->');
        const left = leftRaw.trim();
        if (!startSymbol) startSymbol = left;
        nonTerminals.add(left);
        if (!rules[left]) rules[left] = [];

        rightRaw.split('|').forEach(alt => {
            const tokens = tokenizeItem(alt);
            rules[left].push(tokens);
        });
    });
    return { rules, startSymbol, nonTerminals };
}

function findMultipleDerivations(grammarText, targetText, maxResults = 2) {
    const { rules, startSymbol, nonTerminals } = parseGrammar(grammarText);
    const targetTokens = tokenizeItem(targetText).filter(t => t !== 'ε');

    if (!startSymbol) return [];

    let queue = [{
        tokens: [{ id: '1', label: startSymbol }],
        history: [startSymbol],
        nodes: [{ id: '1', data: { label: startSymbol }, className: 'tree-node non-terminal' }],
        edges: [],
        nextId: 2,
        rulePath: "" // To track uniqueness of derivation
    }];

    const results = [];
    const seenHistories = new Set();
    let iterations = 0;

    while (queue.length > 0 && iterations < 20000 && results.length < maxResults) {
        iterations++;
        const current = queue.shift();

        // Find the leftmost non-terminal
        const expandIdx = current.tokens.findIndex(t => nonTerminals.has(t.label));

        if (expandIdx === -1) {
            const finalString = current.tokens.map(t => t.label).filter(l => l !== 'ε').join('');
            const targetJoin = targetTokens.join('');

            if (finalString === targetJoin) {
                const historyKey = current.history.join('->');
                if (!seenHistories.has(historyKey)) {
                    seenHistories.add(historyKey);
                    results.push(current);
                }
            }
            continue;
        }

        // Heuristic: pruning if it's already too long
        if (current.tokens.filter(t => !nonTerminals.has(t.label) && t.label !== 'ε').length > targetTokens.length) continue;
        if (current.tokens.length > targetTokens.length + 5) continue;

        const tokenToExpand = current.tokens[expandIdx];
        const ruleAlts = rules[tokenToExpand.label] || [];

        for (let altIdx = 0; altIdx < ruleAlts.length; altIdx++) {
            const alt = ruleAlts[altIdx];
            let newNextId = current.nextId;
            let newExpandedTokens = [];
            let newNodes = [...current.nodes];
            let newEdges = [...current.edges];

            for (const sym of alt) {
                const isNonTerm = nonTerminals.has(sym);
                const nid = (newNextId++).toString();
                newExpandedTokens.push({ id: nid, label: sym });
                newNodes.push({
                    id: nid,
                    data: { label: sym },
                    className: `tree-node ${isNonTerm ? 'non-terminal' : (sym.match(/^[a-zA-Z0-9]/) ? 'lexeme' : 'operator')}`
                });
                newEdges.push({
                    id: `e${tokenToExpand.id}-${nid}`,
                    source: tokenToExpand.id,
                    target: nid,
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' },
                    style: { stroke: '#8b949e', strokeWidth: 2 }
                });
            }

            const nextTokens = [
                ...current.tokens.slice(0, expandIdx),
                ...newExpandedTokens,
                ...current.tokens.slice(expandIdx + 1)
            ];

            const nextStr = nextTokens.map(t => t.label).filter(l => l !== 'ε').join('') || 'ε';

            queue.push({
                tokens: nextTokens,
                history: [...current.history, nextStr],
                nodes: newNodes,
                edges: newEdges,
                nextId: newNextId,
                rulePath: current.rulePath + `(${tokenToExpand.label}->${alt.join('')})`
            });
        }
    }

    return results;
}

const AmbiguityChecker = () => {
    const [grammar, setGrammar] = useState("S -> aS | Sa | ε");
    const [targetString, setTargetString] = useState("aaaa");
    const [results, setResults] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState("");
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'analysis'
    const [exampleIdx, setExampleIdx] = useState(0);

    const examples = [
        {
            title: "Recursive 'a' Sequences",
            g: "S -> aS | Sa | ε",
            t: "aaaa"
        },
        {
            title: "Arithmetic: Unambiguous Expression",
            g: "E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id",
            t: "id + id * id"
        },
        {
            title: "Arithmetic: Order of Operations (Ambiguous)",
            g: "E -> E + E | E * E | ( E ) | id",
            t: "id + id * id"
        },
        {
            title: "Arithmetic: Associativity (Left vs Right)",
            g: "E -> E + E | id",
            t: "id + id + id"
        },
        {
            title: "Conditionals: Dangling Else Problem",
            g: "S -> if E then S | if E then S else S | s\nE -> e",
            t: "if e then if e then s else s"
        },
        {
            title: "Sequences: Statement Concatenation",
            g: "S -> S ; S | a",
            t: "a ; a ; a"
        },
        {
            title: "Redundant Paths (Non-terminal Ambiguity)",
            g: "S -> A | B\nA -> x\nB -> x",
            t: "x"
        }
    ];

    const handleCheck = () => {
        setIsChecking(true);
        setError("");

        // Use a timeout to allow the UI to show "Checking..."
        setTimeout(() => {
            try {
                const found = findMultipleDerivations(grammar, targetString);
                setResults(found);
                if (found.length === 0) {
                    setError("No derivation found for the given target string within search limits.");
                } else {
                    setActiveStage('analysis');
                }
            } catch (e) {
                setError("Error parsing grammar or analyzing ambiguity.");
            }
            setIsChecking(false);
        }, 100);
    };

    const loadExample = () => {
        const nextIdx = (exampleIdx + 1) % examples.length;
        setExampleIdx(nextIdx);
        setGrammar(examples[nextIdx].g);
        setTargetString(examples[nextIdx].t);
        setResults([]);
        setActiveStage('config');
    };

    const handleClear = () => {
        setGrammar("");
        setTargetString("");
        setResults([]);
        setError("");
        setActiveStage('config');
    };

    return (
        <div className="ambiguity-unit-container">
            <div className="ambiguity-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit2-3" className="ambiguity-back-link" title="Back to Syntax Unit">
                        <ArrowLeft size={24} />
                    </Link>
                    <AlertTriangle size={28} className="ambiguity-header-icon" />
                    Ambiguity Checker
                </motion.h2>
                <p>Determine if a grammar is ambiguous by detecting multiple unique leftmost derivations for the same string.</p>
            </div>

            <div className="ambiguity-main-grid">
                <div className="ambiguity-rc-panel mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="ambiguity-rc-input-group">
                            <div className="ambiguity-panel-header mb-4">
                                <h3><Zap size={20} className="ambiguity-header-icon" /> Context Free Grammar</h3>
                                <button className="ambiguity-btn-secondary ambiguity-btn-sm" onClick={loadExample} disabled={activeStage !== 'config'}>
                                    Example Change
                                </button>
                            </div>
                            <textarea
                                className="ambiguity-main-input"
                                value={grammar}
                                onChange={(e) => setGrammar(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="S -> aS | Sa | ε"
                            />
                        </div>

                        <div className="ambiguity-rc-input-group">
                            <div className="ambiguity-panel-header mb-4">
                                <h3><AlignLeft size={20} className="ambiguity-header-icon" /> Target String</h3>
                            </div>
                            <input
                                type="text"
                                className="ambiguity-main-input"
                                value={targetString}
                                onChange={(e) => setTargetString(e.target.value)}
                                disabled={activeStage !== 'config'}
                                placeholder="e.g., aaaa"
                            />
                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
                                    <Info size={18} />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="ambiguity-actions-row mt-6">
                        <button
                            className="ambiguity-btn ambiguity-btn-primary"
                            onClick={handleCheck}
                            disabled={isChecking}
                        >
                            {isChecking ? <RotateCcw className="animate-spin" size={18} /> : <Zap size={18} />}
                            {isChecking ? "Checking..." : "Verify Ambiguity"}
                        </button>
                        <button className="ambiguity-btn ambiguity-btn-secondary" onClick={handleClear}>
                            <Eraser size={18} /> Clear Inputs
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="ambiguity-journey-tracker mb-12">
                    <div className="ambiguity-phases-container">
                        {[
                            { id: 1, title: 'Grammar & Target', desc: 'Rules & String', stage: 'config' },
                            { id: 2, title: 'Ambiguity Analysis', desc: 'Detect multiple derivations', stage: 'analysis' }
                        ].map((phase, idx, arr) => {
                            const isCompleted = phase.id === 1 && activeStage !== 'config';
                            const isActive = (phase.id === 1 && activeStage === 'config') ||
                                (phase.id === 2 && activeStage === 'analysis');

                            return (
                                <React.Fragment key={phase.id}>
                                    <div className={`ambiguity-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                        <div className="ambiguity-phase-num">{phase.id}</div>
                                        <div className="ambiguity-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <div className={`ambiguity-phase-arrow ${isCompleted ? 'active' : ''}`}>→</div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage === 'analysis' && results.length > 0 && (
                        <motion.div
                            className="ambiguity-results-container mt-12"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Textbook Style Heading Card */}
                            <motion.div
                                className="ambiguity-stage-card mb-8"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="ambiguity-textbook-header">
                                    <h3 className="math-prob-num text-indigo-400 flex items-center gap-2">
                                        <Sparkles size={20} />
                                        3. Check whether the following grammar is ambiguous or not:
                                    </h3>
                                    <div className="math-grammar-def mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                        <span className="text-slate-300 font-mono">(1) G: {grammar} (String: {targetString})</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Derivations in Cards (Horizontal Grid) */}
                            <div className="ambiguity-results-grid">
                                {results.map((res, resIdx) => (
                                    <motion.div
                                        key={resIdx}
                                        className="ambiguity-stage-card"
                                        initial={{ opacity: 0, x: resIdx === 0 ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: resIdx * 0.2 }}
                                    >
                                        <div className="ambiguity-stage-header mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`ambiguity-phase-num ${resIdx === 0 ? 'bg-blue-500' : 'bg-indigo-500'}`}>
                                                    {resIdx + 1}
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-100">Derivation #{resIdx + 1}</h3>
                                            </div>
                                            <div className="ambiguity-badge success">Complete</div>
                                        </div>

                                        <div className="ambiguity-math-steps ml-2">
                                            {res.history.map((step, stepIdx) => (
                                                <div key={stepIdx} className="ambiguity-step-wrapper">
                                                    <div className={`ambiguity-step-arrow-prefix ${resIdx === 0 ? 'text-blue-400' : 'text-indigo-400'}`}>→</div>
                                                    <div className={`ambiguity-step-item-vertical derivation-${resIdx + 1}`}>
                                                        <span className="font-mono text-lg whitespace-nowrap">
                                                            {step}
                                                            {stepIdx === 0 && <span className="ml-4 italic text-sm text-slate-500">[LMD]</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Final Verdict Summary Card */}
                            <motion.div
                                className={`ambiguity-result-summary mt-8 ${results.length === 1 ? 'success-view' : 'warning-view'}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                {results.length === 1 ? (
                                    <div className="flex items-center gap-4">
                                        <CheckCircle2 size={32} className="text-emerald-400" />
                                        <div>
                                            <h4 className="text-xl font-bold">The grammar is unambiguous for this string.</h4>
                                            <p className="opacity-70">Only one unique leftmost derivation was discovered.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <Sparkles size={32} className="text-indigo-400" />
                                        <div>
                                            <h4 className="text-xl font-bold">Verdict: The grammar is ambiguous.</h4>
                                            <p className="opacity-70 text-lg">
                                                Since there exist two distinct leftmost derivations for the string "{targetString}",
                                                the grammar is mathematically proven to be <strong>ambiguous</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="ambiguity-bottom-spacer" />
            </div>
        </div>
    );
};

export default AmbiguityChecker;
