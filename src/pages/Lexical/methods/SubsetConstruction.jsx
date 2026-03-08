import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Play, ArrowRight, CornerDownRight, ArrowLeft, Zap, RotateCcw, Eraser, Info, List, Network, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import './SubsetConstruction.css';
import { motion, AnimatePresence } from 'framer-motion';

// --- Custom Components ---
const SubsetNode = ({ data }) => (
    <div className={`subset-node-wrapper ${data.isStart ? 'has-start-arrow' : ''}`}>
        {data.isStart && <div className="subset-start-arrow"><ArrowRight size={16} /></div>}
        <div className={`subset-node-container ${data.isAccept ? 'accept' : ''} ${data.isStart ? 'start' : ''}`}>
            <Handle type="target" position={Position.Left} className="subset-handle" />
            <div className="subset-node-circle">
                {data.label}
                {data.isAccept && <div className="subset-node-inner-circle" />}
            </div>
            <Handle type="source" position={Position.Right} className="subset-handle" />
        </div>
    </div>
);

const nodeTypes = { subsetNode: SubsetNode };

const SubsetConstruction = () => {
    const [regex, setRegex] = useState('(a|b)*abb');
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'nfa', 'table', 'dfa', 'minimized'
    const [step, setStep] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [nfaData, setNfaData] = useState(null);
    const [dfaResults, setDfaResults] = useState(null);
    const [nfaFlow, setNfaFlow] = useState({ nodes: [], edges: [] });
    const [dfaFlow, setDfaFlow] = useState({ nodes: [], edges: [] });
    const [minimizedFlow, setMinimizedFlow] = useState({ nodes: [], edges: [] });

    const examples = [
        '(a|b)*abb',
        'a(b|c)*',
        'ab*c',
        'a|b|c',
        '(ab|c)*'
    ];

    // --- Thompson NFA Engine ---
    const buildNFA = (re) => {
        let stateCount = 0;
        const createState = () => stateCount++;
        let pos = 0;
        const input = re.replace(/\s+/g, '');

        const parseExpression = () => {
            let nfa = parseTerm();
            while (pos < input.length && input[pos] === '|') {
                pos++;
                const right = parseTerm();
                const start = createState();
                const end = createState();
                const transitions = [
                    { from: start, to: nfa.start, label: 'ε' },
                    { from: start, to: right.start, label: 'ε' },
                    { from: nfa.end, to: end, label: 'ε' },
                    { from: right.end, to: end, label: 'ε' },
                    ...nfa.transitions,
                    ...right.transitions
                ];
                nfa = { start, end, transitions, states: [...nfa.states, ...right.states, start, end] };
            }
            return nfa;
        };

        const parseTerm = () => {
            let nfa = parseFactor();
            while (pos < input.length && input[pos] !== '|' && input[pos] !== ')') {
                const right = parseFactor();
                const transitions = [
                    ...nfa.transitions,
                    ...right.transitions,
                    { from: nfa.end, to: right.start, label: 'ε' }
                ];
                nfa = { start: nfa.start, end: right.end, transitions, states: [...nfa.states, ...right.states] };
            }
            return nfa;
        };

        const parseFactor = () => {
            let nfa = parseBase();
            while (pos < input.length && input[pos] === '*') {
                pos++;
                const start = createState();
                const end = createState();
                const transitions = [
                    { from: start, to: nfa.start, label: 'ε' },
                    { from: start, to: end, label: 'ε' },
                    { from: nfa.end, to: nfa.start, label: 'ε' },
                    { from: nfa.end, to: end, label: 'ε' },
                    ...nfa.transitions
                ];
                nfa = { start, end, transitions, states: [...nfa.states, start, end] };
            }
            return nfa;
        };

        const parseBase = () => {
            if (input[pos] === '(') {
                pos++;
                const nfa = parseExpression();
                pos++; // skip ')'
                return nfa;
            } else {
                const char = input[pos++];
                const start = createState();
                const end = createState();
                return {
                    start,
                    end,
                    transitions: [{ from: start, to: end, label: char }],
                    states: [start, end]
                };
            }
        };

        const result = parseExpression();
        return {
            states: result.states.sort((a, b) => a - b),
            start: result.start,
            accepts: [result.end],
            transitions: result.transitions
        };
    };

    // --- Subset Construction Engine ---
    const epsilonClosure = (states, transitions) => {
        let stack = [...states];
        let closure = new Set(states);
        while (stack.length > 0) {
            let t = stack.pop();
            transitions.filter(tr => tr.from === t && tr.label === 'ε').forEach(tr => {
                if (!closure.has(tr.to)) {
                    closure.add(tr.to);
                    stack.push(tr.to);
                }
            });
        }
        return Array.from(closure).sort((a, b) => a - b);
    };

    const move = (states, symbol, transitions) => {
        let results = new Set();
        states.forEach(s => {
            transitions.filter(tr => tr.from === s && tr.label === symbol).forEach(tr => {
                results.add(tr.to);
            });
        });
        return Array.from(results);
    };

    const generateDFA = (nfa) => {
        // Extract unique symbols (alphabet) excluding epsilon
        const alphabet = Array.from(new Set(nfa.transitions.map(t => t.label).filter(l => l !== 'ε'))).sort();

        const dStates = [];
        const dTran = [];
        const startClosure = epsilonClosure([nfa.start], nfa.transitions);

        dStates.push({ id: 0, nfaStates: startClosure, label: 'A', isStart: true, isAccept: startClosure.some(s => nfa.accepts.includes(s)) });

        let i = 0;
        while (i < dStates.length) {
            const T = dStates[i];
            const transitions = {};

            alphabet.forEach(symbol => {
                const U = epsilonClosure(move(T.nfaStates, symbol, nfa.transitions), nfa.transitions);
                if (U.length > 0) {
                    // Comparison without in-place sort side effects
                    const sortedU = [...U].sort((a, b) => a - b);
                    let existing = dStates.find(s => JSON.stringify([...s.nfaStates].sort((a, b) => a - b)) === JSON.stringify(sortedU));

                    if (!existing) {
                        const nextLabel = String.fromCharCode(65 + dStates.length);
                        existing = {
                            id: dStates.length,
                            nfaStates: sortedU,
                            label: nextLabel,
                            isAccept: sortedU.some(s => nfa.accepts.includes(s))
                        };
                        dStates.push(existing);
                    }
                    transitions[symbol] = existing.label;
                }
            });
            dTran.push({ state: T.label, nfaStates: T.nfaStates.join(','), ...transitions });
            i++;
        }
        return { dStates, dTran, alphabet };
    };

    const minimizeDFA = (dfa) => {
        const { dStates, dTran, alphabet } = dfa;
        if (dStates.length <= 1) return dfa;

        // 1. Initial partitions: Accepting vs Non-Accepting
        let partitions = [];
        const nonAccepting = dStates.filter(s => !s.isAccept).map(s => s.label);
        const accepting = dStates.filter(s => s.isAccept).map(s => s.label);

        // Ensure the partition containing the start state 'A' is prioritized to be first
        // This ensures the start state is always labeled 'A' in the minimized DFA
        const startLabel = dStates.find(s => s.isStart).label;
        if (nonAccepting.includes(startLabel)) {
            if (nonAccepting.length > 0) partitions.push(nonAccepting);
            if (accepting.length > 0) partitions.push(accepting);
        } else {
            if (accepting.length > 0) partitions.push(accepting);
            if (nonAccepting.length > 0) partitions.push(nonAccepting);
        }

        let changed = true;
        while (changed) {
            changed = false;
            let newPartitions = [];

            for (const partition of partitions) {
                if (partition.length <= 1) {
                    newPartitions.push(partition);
                    continue;
                }

                const subgroups = {};
                for (const stateLabel of partition) {
                    const row = dTran.find(r => r.state === stateLabel);
                    const transitionKey = alphabet.map(sym => {
                        const targetLabel = row[sym];
                        if (!targetLabel) return 'dead';
                        const targetPartitionIdx = partitions.findIndex(p => p.includes(targetLabel));
                        return targetPartitionIdx;
                    }).join(',');

                    if (!subgroups[transitionKey]) subgroups[transitionKey] = [];
                    subgroups[transitionKey].push(stateLabel);
                }

                const groupValues = Object.values(subgroups);
                if (groupValues.length > 1) {
                    changed = true;
                    // Maintenance: Ensure start state group is always first in the new list if it exists here
                    const startGroupIdx = groupValues.findIndex(g => g.includes(startLabel));
                    if (startGroupIdx > 0) {
                        const startGroup = groupValues.splice(startGroupIdx, 1)[0];
                        groupValues.unshift(startGroup);
                    }
                }
                newPartitions.push(...groupValues);
            }
            partitions = newPartitions;
        }

        // 2. Build new states and transitions
        const newDStates = partitions.map((partition, idx) => {
            const representative = dStates.find(s => s.label === partition[0]);
            const label = String.fromCharCode(65 + idx);
            const mergedNfaStates = Array.from(new Set(partition.flatMap(l => {
                return dStates.find(s => s.label === l).nfaStates;
            }))).sort((a, b) => a - b);

            return {
                id: idx,
                label,
                isStart: partition.some(l => dStates.find(s => s.label === l).isStart),
                isAccept: representative.isAccept,
                nfaStates: mergedNfaStates,
                originalLabels: partition
            };
        });

        const newDTran = newDStates.map(state => {
            const representativeLabel = state.originalLabels[0];
            const originalRow = dTran.find(r => r.state === representativeLabel);
            const transitions = {};
            alphabet.forEach(sym => {
                const targetLabel = originalRow[sym];
                if (targetLabel) {
                    const targetPartitionIdx = partitions.findIndex(p => p.includes(targetLabel));
                    transitions[sym] = newDStates[targetPartitionIdx].label;
                }
            });
            return {
                state: state.label,
                nfaStates: state.nfaStates.join(','),
                ...transitions
            };
        });

        return { dStates: newDStates, dTran: newDTran, alphabet };
    };

    // --- Layout Logic ---
    const getLayoutedElements = (nodes, edges) => {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR', nodesep: 150, ranksep: 220 });
        g.setDefaultEdgeLabel(() => ({}));
        nodes.forEach(node => g.setNode(node.id, { width: 50, height: 50 }));
        edges.forEach(edge => g.setEdge(edge.source, edge.target));
        dagre.layout(g);
        return nodes.map(node => {
            const pos = g.node(node.id);
            return { ...node, position: { x: pos.x - 25, y: pos.y - 25 } };
        });
    };

    const startSimulation = () => {
        if (!regex.trim()) return;
        const nfa = buildNFA(regex);
        const dfa = generateDFA(nfa);
        setNfaData(nfa);
        setDfaResults(dfa);
        setActiveStage('nfa');
        setStep(0);
        setIsAutoPlaying(false);

        // Generate React Flow elements for NFA initially
        const nfaNodes = nfa.states.map(s => ({
            id: `nfa-${s}`,
            type: 'subsetNode',
            data: { label: s, isStart: s === nfa.start, isAccept: nfa.accepts.includes(s) },
            position: { x: 0, y: 0 }
        }));

        // Merge NFA edges for multi-transitions
        const nfaEdgeMap = {};
        nfa.transitions.forEach(t => {
            const key = `${t.from}->${t.to}`;
            if (!nfaEdgeMap[key]) {
                nfaEdgeMap[key] = { from: t.from, to: t.to, labels: [t.label] };
            } else if (!nfaEdgeMap[key].labels.includes(t.label)) {
                nfaEdgeMap[key].labels.push(t.label);
            }
        });

        const nfaEdges = Object.values(nfaEdgeMap).map((e, idx) => ({
            id: `nfa-e-${idx}`,
            source: `nfa-${e.from}`,
            target: `nfa-${e.to}`,
            label: e.labels.join(', '),
            type: 'straight'
        }));

        setNfaFlow({
            nodes: getLayoutedElements(nfaNodes, nfaEdges),
            edges: nfaEdges
        });

        // --- Generate Subset DFA Flow (Matches Table) ---
        const subsetNodes = dfa.dStates.map(s => ({
            id: `dfa-${s.label}`,
            type: 'subsetNode',
            data: { label: s.label, isStart: s.isStart, isAccept: s.isAccept },
            position: { x: 0, y: 0 }
        }));

        const subsetEdgeMap = {};
        dfa.dTran.forEach(row => {
            dfa.alphabet.forEach(sym => {
                if (row[sym]) {
                    const key = `${row.state}->${row[sym]}`;
                    if (!subsetEdgeMap[key]) {
                        subsetEdgeMap[key] = { source: row.state, target: row[sym], labels: [sym] };
                    } else if (!subsetEdgeMap[key].labels.includes(sym)) {
                        subsetEdgeMap[key].labels.push(sym);
                    }
                }
            });
        });

        const subsetEdges = Object.values(subsetEdgeMap).map((e, idx) => ({
            id: `subset-e-${idx}`,
            source: `dfa-${e.source}`,
            target: `dfa-${e.target}`,
            label: e.labels.join(', '),
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'rgba(129, 140, 248, 0.6)', strokeWidth: 2 },
            labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 13 },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: 'rgba(15, 23, 42, 0.85)', stroke: 'rgba(129, 140, 248, 0.3)', strokeWidth: 1 }
        }));

        setDfaFlow({
            nodes: getLayoutedElements(subsetNodes, subsetEdges),
            edges: subsetEdges
        });

        // --- Generate Minimized DFA Flow (Optimized) ---
        const minimized = minimizeDFA(dfa);
        const minNodes = minimized.dStates.map(s => ({
            id: `min-${s.label}`,
            type: 'subsetNode',
            data: { label: s.label, isStart: s.isStart, isAccept: s.isAccept },
            position: { x: 0, y: 0 }
        }));

        const minEdgeMap = {};
        minimized.dTran.forEach(row => {
            minimized.alphabet.forEach(sym => {
                if (row[sym]) {
                    const key = `${row.state}->${row[sym]}`;
                    if (!minEdgeMap[key]) {
                        minEdgeMap[key] = { source: row.state, target: row[sym], labels: [sym] };
                    } else if (!minEdgeMap[key].labels.includes(sym)) {
                        minEdgeMap[key].labels.push(sym);
                    }
                }
            });
        });

        const minEdges = Object.values(minEdgeMap).map((e, idx) => ({
            id: `min-e-${idx}`,
            source: `min-${e.source}`,
            target: `min-${e.target}`,
            label: e.labels.join(', '),
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'rgba(34, 197, 94, 0.6)', strokeWidth: 2 },
            labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 13 },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: 'rgba(15, 23, 42, 0.85)', stroke: 'rgba(34, 197, 94, 0.3)', strokeWidth: 1 }
        }));

        setMinimizedFlow({
            nodes: getLayoutedElements(minNodes, minEdges),
            edges: minEdges
        });
    };

    const handleNextStage = () => {
        if (activeStage === 'nfa') setActiveStage('table');
        else if (activeStage === 'table') setActiveStage('dfa');
        else if (activeStage === 'dfa') setActiveStage('minimized');
    };

    const handleReset = () => {
        setActiveStage('config');
        setStep(0);
        setIsAutoPlaying(false);
        setNfaFlow({ nodes: [], edges: [] });
        setDfaFlow({ nodes: [], edges: [] });
        setMinimizedFlow({ nodes: [], edges: [] });
    };

    // Auto-Play Logic
    useEffect(() => {
        let timer;
        if (isAutoPlaying && activeStage === 'table' && step < dfaResults.dTran.length) {
            timer = setTimeout(() => {
                setStep(prev => prev + 1);
            }, 1000);
        } else if (isAutoPlaying && step === dfaResults.dTran.length) {
            setIsAutoPlaying(false);
            // Sequence: Table -> Subset DFA (1s) -> Minimized DFA (3s)
            setTimeout(() => {
                setActiveStage('dfa');
                setTimeout(() => setActiveStage('minimized'), 3000);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [isAutoPlaying, step, activeStage, dfaResults]);

    // Handle stage auto-progression logic
    useEffect(() => {
        if (activeStage === 'nfa') {
            // Wait for user to see the NFA, then show table
            const timer = setTimeout(() => setActiveStage('table'), 2000);
            return () => clearTimeout(timer);
        }
        if (activeStage === 'table' && !isAutoPlaying && step === 0) {
            // Start table computation automatically
            const timer = setTimeout(() => setIsAutoPlaying(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [activeStage, isAutoPlaying, step]);

    // --- UI Helpers for Stacked View (Removed Redundant Helpers) ---


    return (
        <div className="subset-unit-container">
            <div className="subset-workspace-header">
                <h2>
                    <Link to="/unit1" className="subset-back-link">
                        <ArrowLeft size={24} />
                    </Link>
                    <Layers size={28} className="subset-header-icon" />
                    Subset Construction (NFA to DFA)
                </h2>
                <p>Animate the conversion from non-deterministic groupings to deterministic states.</p>
            </div>

            <div className="subset-main-grid">
                {/* Configuration Panel */}
                <div className="glass-panel subset-rc-panel mb-10">
                    <div className="subset-rc-input-group">
                        <div className="subset-panel-header mb-4">
                            <h3><Zap size={20} /> Regular Expression</h3>
                            {activeStage === 'config' && (
                                <button className="subset-btn-secondary subset-btn-sm" onClick={() => setRegex(examples[Math.floor(Math.random() * examples.length)])}>
                                    Example Change
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={regex}
                            onChange={(e) => setRegex(e.target.value)}
                            className="subset-rc-input"
                            disabled={activeStage !== 'config'}
                            placeholder="e.g. (a|b)*abb"
                        />
                    </div>

                    <div className="actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button
                                className="subset-btn subset-btn-primary"
                                onClick={startSimulation}
                                disabled={!regex.trim()}
                            >
                                <Zap size={18} /> Generate Full Journey
                            </button>
                        ) : (
                            <button className="subset-btn subset-btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Clear & Edit
                            </button>
                        )}
                        <button className="subset-btn subset-btn-secondary" onClick={() => { setRegex(''); handleReset(); }}>
                            <Eraser size={18} /> Input Clear
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                <div className="subset-journey-tracker mb-12">
                    <div className="subset-phases-container">
                        {[
                            { id: 1, title: 'Source NFA', desc: 'Thompson structural map', stage: 'nfa' },
                            { id: 2, title: 'Computation', desc: 'Subset grouping logic', stage: 'table' },
                            { id: 3, title: 'Subset DFA', desc: 'Direct state mapping', stage: 'dfa' },
                            { id: 4, title: 'Minimized DFA', desc: 'Mathematical optimum', stage: 'minimized' }
                        ].map((phase, idx, arr) => {
                            const isCompleted = (phase.stage === 'config' && activeStage !== 'config') ||
                                (phase.stage === 'nfa' && ['table', 'dfa', 'minimized'].includes(activeStage)) ||
                                (phase.stage === 'table' && ['dfa', 'minimized'].includes(activeStage)) ||
                                (phase.stage === 'dfa' && activeStage === 'minimized');
                            const isActive = activeStage === phase.stage;

                            return (
                                <React.Fragment key={phase.id}>
                                    <div className={`subset-phase-box ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                        <div className="subset-phase-num">{phase.id}</div>
                                        <div className="subset-phase-info">
                                            <h4>{phase.title}</h4>
                                            <p>{phase.desc}</p>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <ArrowRight className={`subset-phase-arrow ${isCompleted ? 'active' : ''}`} size={20} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {activeStage !== 'config' && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="subset-journey-stack"
                        >
                            {/* Step 1: NFA Visualization */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-panel subset-stage-card"
                            >
                                <div className="subset-stage-header mb-6">
                                    <div className="subset-stage-title">
                                        <Network size={24} />
                                        <h3>Step 1: Source NFA Map</h3>
                                    </div>
                                    <div className="subset-badge">Thompson Construction</div>
                                </div>
                                <div className="subset-flow-canvas">
                                    <ReactFlow
                                        nodes={nfaFlow.nodes}
                                        edges={nfaFlow.edges}
                                        nodeTypes={nodeTypes}
                                        fitView
                                        nodesDraggable={false}
                                        panOnDrag={true}
                                        zoomOnScroll={true}
                                        zoomOnPinch={true}
                                        zoomOnDoubleClick={true}
                                        preventScrolling={false}
                                    >
                                        <Background color="#334155" gap={20} />
                                        <Controls showInteractive={false} />
                                    </ReactFlow>
                                </div>
                            </motion.div>

                            {/* Step 2: Computation Table */}
                            {['table', 'dfa'].includes(activeStage) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-panel subset-stage-card"
                                >
                                    <div className="subset-stage-header mb-6">
                                        <div className="subset-stage-title">
                                            <List size={24} />
                                            <h3>Step 2: D-Tran Table Computation</h3>
                                        </div>
                                    </div>

                                    <div className="subset-computations-grid">
                                        <div className="table-area">
                                            <table className="subset-data-table">
                                                <thead>
                                                    <tr>
                                                        <th>DFA State</th>
                                                        <th>NFA States (ε-closure)</th>
                                                        {dfaResults.alphabet.map((sym, i) => (
                                                            <th key={sym} className={i % 2 === 0 ? "th-blue" : "th-green"}>
                                                                move(T, {sym})
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dfaResults.dTran.slice(0, step).map((row, idx) => (
                                                        <motion.tr
                                                            key={idx}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                        >
                                                            <td className="bold">{row.state}</td>
                                                            <td className="nfa-states">{row.nfaStates}</td>
                                                            {dfaResults.alphabet.map(sym => (
                                                                <td key={sym} className="move-val">{row[sym] || '-'}</td>
                                                            ))}
                                                        </motion.tr>
                                                    ))}
                                                    {step < dfaResults.dTran.length && (
                                                        <tr className="computing-row">
                                                            <td colSpan={2 + dfaResults.alphabet.length}>
                                                                <div className="loader-dots">
                                                                    <span></span><span></span><span></span>
                                                                    Computing {dfaResults.dTran[step].state}...
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="glass-panel logic-sidebar">
                                            <h4><Info size={18} /> Conversion Logic:</h4>
                                            <ul className="logic-list">
                                                <li><strong>ε-closure</strong>: Reachable states using only ε.</li>
                                                <li><strong>move(T, x)</strong>: Reachable from T on input x.</li>
                                                <li><strong>Labels</strong>: Alphabet letters (A, B, C...) assigned to sets.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: DFA Graph */}
                            {/* Step 3: Subset DFA (Directly matching the table) */}
                            {['dfa', 'minimized'].includes(activeStage) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-panel subset-stage-card"
                                >
                                    <div className="subset-stage-header mb-6">
                                        <div className="subset-stage-title">
                                            <Network size={24} />
                                            <h3>Step 3: Subset DFA Graph</h3>
                                        </div>
                                        <div className="subset-badge">Maps to Step 2 Table</div>
                                    </div>
                                    <div className="subset-flow-canvas">
                                        <ReactFlow
                                            nodes={dfaFlow.nodes}
                                            edges={dfaFlow.edges}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            nodesDraggable={false}
                                            panOnDrag={true}
                                            zoomOnScroll={true}
                                            zoomOnPinch={true}
                                            zoomOnDoubleClick={true}
                                            preventScrolling={false}
                                        >
                                            <Background color="#334155" gap={20} />
                                            <Controls showInteractive={false} />
                                        </ReactFlow>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 4: Final Optimized DFA Graph */}
                            {activeStage === 'minimized' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-panel subset-stage-card"
                                >
                                    <div className="subset-stage-header mb-6">
                                        <div className="subset-stage-title">
                                            <Box size={24} />
                                            <h3>Step 4: Final Optimized DFA Graph</h3>
                                        </div>
                                        <div className="subset-badge success">Minimization Complete</div>
                                        <button className="subset-btn subset-btn-secondary" onClick={handleReset}>
                                            <Eraser size={16} /> Clear Journey
                                        </button>
                                    </div>
                                    <div className="subset-flow-canvas" style={{ border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                        <ReactFlow
                                            nodes={minimizedFlow.nodes}
                                            edges={minimizedFlow.edges}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            nodesDraggable={false}
                                            panOnDrag={true}
                                            zoomOnScroll={true}
                                            zoomOnPinch={true}
                                            zoomOnDoubleClick={true}
                                            preventScrolling={false}
                                        >
                                            <Background color="#334155" gap={20} />
                                            <Controls showInteractive={false} />
                                        </ReactFlow>
                                    </div>
                                </motion.div>
                            )}        <div className="subset-bottom-spacer"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SubsetConstruction;
// Trigger reload 🔄
