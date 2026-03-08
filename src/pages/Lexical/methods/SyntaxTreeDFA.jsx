import React, { useState, useEffect, useCallback } from 'react';
import { Hash, GitMerge, Network, ArrowLeft, Play, RotateCcw, Info, List, Network as TreeIcon, Box, Zap, ChevronRight, CornerDownRight, Eraser, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import dagre from 'dagre';
import { motion, AnimatePresence } from 'framer-motion';
import '@xyflow/react/dist/style.css';
import './SyntaxTreeDFA.css';

// --- Custom Tree Node Component ---
const SyntaxLeafNode = ({ data }) => (
    <div className="syntax-tree-node">
        <Handle type="target" position={Position.Top} className="syntax-handle" />
        <div className="syntax-node-nullable" style={{ background: data.nullable ? '#10b981' : '#f43f5e' }}>
            {data.nullable ? 'T' : 'F'}
        </div>
        <div className="syntax-node-firstpos">{`{${(data.firstpos || []).join(',')}}`}</div>
        <div className="syntax-node-lastpos">{`{${(data.lastpos || []).join(',')}}`}</div>
        <div className="syntax-node-label">{data.label}</div>
        {data.pos && <div className="syntax-node-pos" style={{ position: 'absolute', bottom: '-40px', color: '#6366f1', fontWeight: 'bold' }}>{data.pos}</div>}
        <Handle type="source" position={Position.Bottom} className="syntax-handle" />
    </div>
);

const SubsetNode = ({ data }) => (
    <div className={`syntax-dfa-node-container ${data.isAccept ? 'accept' : ''} ${data.isStart ? 'start' : ''}`}>
        <Handle type="target" position={Position.Left} className="syntax-handle" />
        <div className="syntax-dfa-node-circle">{data.label}</div>
        {data.isAccept && <div className="syntax-dfa-node-accept-ring" />}
        <div className="syntax-dfa-node-mapping">{`{${(data.nfaStates || []).join(',')}}`}</div>
        <Handle type="source" position={Position.Right} className="syntax-handle" />
    </div>
);

const nodeTypes = {
    syntaxNode: SyntaxLeafNode,
    subsetNode: SubsetNode
};

const SyntaxTreeDFA = () => {
    const [regex, setRegex] = useState('(a|b)*abb#');
    const [activeStage, setActiveStage] = useState('config'); // 'config', 'tree', 'followpos', 'dfa'
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [treeData, setTreeData] = useState(null);
    const [followposTable, setFollowposTable] = useState([]);
    const [dfaResults, setDfaResults] = useState(null);
    const [treeFlow, setTreeFlow] = useState({ nodes: [], edges: [] });
    const [dfaFlow, setDfaFlow] = useState({ nodes: [], edges: [] });

    const examples = ['(a|b)*abb#', 'a(b|c)*#', 'ab*c#', 'a*b*#'];

    // --- Core Engine Logic ---
    const buildSyntaxTree = (input) => {
        // 1. Preprocess: Add explicit concatenation '.'
        let re = input.replace(/\s+/g, '');
        let output = "";
        for (let i = 0; i < re.length; i++) {
            output += re[i];
            if (i + 1 < re.length) {
                let current = re[i];
                let next = re[i + 1];
                if ((current !== '(' && current !== '|') && (next !== ')' && next !== '*' && next !== '|')) {
                    output += '.';
                }
            }
        }

        // 2. Shunting-Yard to Postfix
        const precedence = { '*': 3, '.': 2, '|': 1 };
        const stack = [];
        const postfix = [];
        for (let char of output) {
            if (char === '(') stack.push(char);
            else if (char === ')') {
                while (stack.length && stack[stack.length - 1] !== '(') postfix.push(stack.pop());
                stack.pop();
            } else if (precedence[char]) {
                while (stack.length && precedence[stack[stack.length - 1]] >= precedence[char]) postfix.push(stack.pop());
                stack.push(char);
            } else {
                postfix.push(char);
            }
        }
        while (stack.length) postfix.push(stack.pop());

        // 3. Build Tree & Compute Nullable/Firstpos/Lastpos
        let posCount = 1;
        const treeStack = [];
        const leafNodes = [];

        postfix.forEach(token => {
            if (token === '*') {
                const child = treeStack.pop();
                const node = {
                    label: '*',
                    left: child,
                    nullable: true,
                    firstpos: [...child.firstpos],
                    lastpos: [...child.lastpos]
                };
                treeStack.push(node);
            } else if (token === '.' || token === '|') {
                const right = treeStack.pop();
                const left = treeStack.pop();
                const node = { label: token, left, right };
                if (token === '|') {
                    node.nullable = left.nullable || right.nullable;
                    node.firstpos = [...new Set([...left.firstpos, ...right.firstpos])].sort((a, b) => a - b);
                    node.lastpos = [...new Set([...left.lastpos, ...right.lastpos])].sort((a, b) => a - b);
                } else {
                    node.nullable = left.nullable && right.nullable;
                    node.firstpos = left.nullable ? [...new Set([...left.firstpos, ...right.firstpos])].sort((a, b) => a - b) : [...left.firstpos];
                    node.lastpos = right.nullable ? [...new Set([...left.lastpos, ...right.lastpos])].sort((a, b) => a - b) : [...right.lastpos];
                }
                treeStack.push(node);
            } else {
                const node = {
                    label: token,
                    pos: posCount++,
                    nullable: false,
                    firstpos: [posCount - 1],
                    lastpos: [posCount - 1]
                };
                leafNodes.push(node);
                treeStack.push(node);
            }
        });

        const root = treeStack[0];

        // 4. Compute Followpos
        const followpos = {};
        for (let i = 1; i < posCount; i++) followpos[i] = new Set();

        const traverseFollow = (node) => {
            if (!node) return;
            if (node.label === '.') {
                node.left.lastpos.forEach(i => {
                    node.right.firstpos.forEach(j => {
                        followpos[i].add(j);
                    });
                });
            } else if (node.label === '*') {
                node.lastpos.forEach(i => {
                    node.firstpos.forEach(j => {
                        followpos[i].add(j);
                    });
                });
            }
            traverseFollow(node.left);
            traverseFollow(node.right);
        };
        traverseFollow(root);

        // Convert sets to sorted arrays
        const followTable = Object.entries(followpos).map(([p, set]) => ({
            pos: parseInt(p),
            symbol: leafNodes.find(l => l.pos === parseInt(p)).label,
            follow: Array.from(set).sort((a, b) => a - b)
        }));

        return { root, leafNodes, followTable, alphabet: Array.from(new Set(leafNodes.map(l => l.label).filter(l => l !== '#'))).sort() };
    };

    const constructDFA = (treeInfo) => {
        const { root, followTable, alphabet } = treeInfo;
        const dStates = [];
        const startPos = root.firstpos;
        const statesQueue = [startPos];
        dStates.push({ label: 'A', positions: startPos });

        const transitions = [];
        let i = 0;
        while (i < statesQueue.length) {
            const currentSet = statesQueue[i];
            const currentLabel = dStates[i].label;

            alphabet.forEach(symbol => {
                const nextPositions = new Set();
                currentSet.forEach(pos => {
                    const leaf = treeInfo.leafNodes.find(l => l.pos === pos);
                    if (leaf.label === symbol) {
                        const follow = followTable.find(f => f.pos === pos).follow;
                        follow.forEach(p => nextPositions.add(p));
                    }
                });

                if (nextPositions.size > 0) {
                    const sortedNext = Array.from(nextPositions).sort((a, b) => a - b);
                    let existing = dStates.find(s => JSON.stringify(s.positions) === JSON.stringify(sortedNext));
                    if (!existing) {
                        const nextLabel = String.fromCharCode(65 + dStates.length);
                        existing = { label: nextLabel, positions: sortedNext };
                        dStates.push(existing);
                        statesQueue.push(sortedNext);
                    }
                    transitions.push({ from: currentLabel, to: existing.label, label: symbol });
                }
            });
            i++;
        }

        // Final state is the one containing '#' (last position)
        const hashPos = treeInfo.leafNodes.find(l => l.label === '#').pos;
        dStates.forEach(s => {
            s.isAccept = s.positions.includes(hashPos);
            if (s.label === 'A') s.isStart = true;
        });

        return { dStates, transitions };
    };

    const getLayoutedElements = (nodes, edges, direction = 'TB') => {
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 50 });
        g.setDefaultEdgeLabel(() => ({}));
        nodes.forEach(n => g.setNode(n.id, { width: 80, height: 80 }));
        edges.forEach(e => g.setEdge(e.source, e.target));
        dagre.layout(g);
        return nodes.map(n => {
            const nodeWithPos = g.node(n.id);
            return { ...n, position: { x: nodeWithPos.x - 40, y: nodeWithPos.y - 40 } };
        });
    };

    const startSimulation = () => {
        if (!regex.endsWith('#')) {
            alert('Please augment your regex with # at the end!');
            return;
        }

        const treeInfo = buildSyntaxTree(regex);
        const dfa = constructDFA(treeInfo);

        // Generate Tree Flow
        const nNodes = [];
        const nEdges = [];
        let idCount = 0;
        const processNode = (node, parentId = null) => {
            const id = `node-${idCount++}`;
            nNodes.push({
                id,
                type: 'syntaxNode',
                data: { label: node.label, nullable: node.nullable, firstpos: node.firstpos, lastpos: node.lastpos, pos: node.pos },
                position: { x: 0, y: 0 }
            });
            if (parentId) nEdges.push({ id: `e-${parentId}-${id}`, source: parentId, target: id, animated: true });
            if (node.left) processNode(node.left, id);
            if (node.right) processNode(node.right, id);
        };
        processNode(treeInfo.root);

        // Generate DFA Flow
        const dNodes = dfa.dStates.map(s => ({
            id: `dfa-${s.label}`,
            type: 'subsetNode', // Reuse styling logic if possible, or define locally
            data: { label: s.label, isStart: s.isStart, isAccept: s.isAccept, nfaStates: s.positions },
            position: { x: 0, y: 0 }
        }));
        const dEdges = dfa.transitions.map((t, idx) => ({
            id: `de-${idx}`,
            source: `dfa-${t.from}`,
            target: `dfa-${t.to}`,
            label: t.label,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 }
        }));

        setFollowposTable(treeInfo.followTable);
        setDfaResults(dfa);
        setTreeFlow({ nodes: getLayoutedElements(nNodes, nEdges), edges: nEdges });
        setDfaFlow({ nodes: getLayoutedElements(dNodes, dEdges, 'LR'), edges: dEdges });

        setActiveStage('dfa');
        setIsAutoPlaying(true);
    };



    return (
        <div className="syntax-unit-container">
            <div className="syntax-workspace-header">
                <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link to="/unit1" className="syntax-back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Hash size={28} className="syntax-header-icon" />
                    Direct RE to DFA Engine
                </motion.h2>
                <p>Construct DFA directly via Augmented Syntax Tree Algorithm.</p>
            </div>

            <div className="syntax-main-grid">
                {/* Configuration Panel */}
                <div className="syntax-rc-panel mb-10">
                    <div className="syntax-rc-input-group">
                        <div className="syntax-panel-header mb-4">
                            <h3><Zap size={20} className="syntax-header-icon" /> Regular Expression</h3>
                            <div className="flex gap-2 items-center">
                                {activeStage === 'config' && (
                                    <button
                                        className="syntax-btn-secondary syntax-btn-sm mr-2"
                                        onClick={() => setRegex(examples[Math.floor(Math.random() * examples.length)])}
                                    >
                                        Example Change
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="text"
                            value={regex}
                            onChange={(e) => setRegex(e.target.value)}
                            className="syntax-main-input"
                            disabled={activeStage !== 'config'}
                            placeholder="Enter Augmented Regex (e.g. (a|b)*abb#)"
                        />
                    </div>

                    <div className="syntax-actions-row mt-6">
                        {activeStage === 'config' ? (
                            <button className="syntax-btn syntax-btn-primary" onClick={startSimulation}>
                                <Play size={18} /> Generate Full Journey
                            </button>
                        ) : (
                            <button className="syntax-btn syntax-btn-secondary" onClick={() => setActiveStage('config')}>
                                <RotateCcw size={18} /> Clear & Edit
                            </button>
                        )}
                        <button className="syntax-btn syntax-btn-secondary" onClick={() => { setRegex(''); setActiveStage('config'); }}>
                            <Eraser size={18} /> Input Clear
                        </button>
                    </div>
                </div>

                {/* Journey Tracker */}
                {activeStage !== 'config' && (
                    <div className="syntax-journey-tracker mb-12">
                        <div className="syntax-phases-container">
                            {[
                                { id: 1, title: 'Syntax Tree', desc: 'Positional map', stage: 'tree' },
                                { id: 2, title: 'Followpos', desc: 'Direct logic table', stage: 'followpos' },
                                { id: 3, title: 'Final DFA', desc: 'Direct construction', stage: 'dfa' }
                            ].map((phase, idx, arr) => {
                                const isCompleted = (phase.stage === 'tree' && ['followpos', 'dfa'].includes(activeStage)) ||
                                    (phase.stage === 'followpos' && activeStage === 'dfa');
                                const isActive = activeStage === phase.stage;

                                return (
                                    <React.Fragment key={phase.id}>
                                        <div
                                            className={`syntax-phase-box cursor-pointer ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                            onClick={() => setActiveStage(phase.stage)}
                                        >
                                            <div className="syntax-phase-num">{phase.id}</div>
                                            <div className="syntax-phase-info">
                                                <h4>{phase.title}</h4>
                                                <p>{phase.desc}</p>
                                            </div>
                                        </div>
                                        {idx < arr.length - 1 && (
                                            <ArrowRight className={`syntax-phase-arrow ${isCompleted ? 'active' : ''}`} size={20} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {activeStage !== 'config' && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="syntax-journey-stack"
                        >
                            {/* Step 1: Syntax Tree */}
                            {activeStage !== 'config' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="syntax-stage-card"
                                >
                                    <div className="syntax-stage-header mb-6">
                                        <div className="syntax-stage-title">
                                            <Box size={24} className="text-indigo-400" />
                                            <h3>Step 1: Augmented Syntax Tree</h3>
                                        </div>
                                        <div className="syntax-badge">Positions: {followposTable.length}</div>
                                    </div>
                                    <div className="syntax-flow-canvas">
                                        <ReactFlow
                                            nodes={treeFlow.nodes}
                                            edges={treeFlow.edges}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            nodesDraggable={false}
                                        >
                                            <Background color="#334155" gap={20} />
                                            <Controls showInteractive={false} />
                                        </ReactFlow>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 2: Followpos Table */}
                            {activeStage !== 'config' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="syntax-stage-card"
                                >
                                    <div className="syntax-stage-header mb-6">
                                        <div className="syntax-stage-title">
                                            <List size={24} className="text-indigo-400" />
                                            <h3>Step 2: Followpos Table</h3>
                                        </div>
                                    </div>
                                    <div className="syntax-scroll-area">
                                        <table className="syntax-table">
                                            <thead>
                                                <tr>
                                                    <th>Position</th>
                                                    <th>Symbol</th>
                                                    <th>Followpos(i)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {followposTable.map(row => (
                                                    <tr key={row.pos}>
                                                        <td>{row.pos}</td>
                                                        <td className="text-indigo-400 font-bold">{row.symbol}</td>
                                                        <td>{row.follow.length > 0 ? `{${row.follow.join(', ')}}` : '∅'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Final DFA */}
                            {activeStage !== 'config' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="syntax-stage-card"
                                >
                                    <div className="syntax-stage-header mb-6">
                                        <div className="syntax-stage-title">
                                            <Network size={24} className="text-green-400" />
                                            <h3>Step 3: Direct DFA Result</h3>
                                        </div>
                                        <div className="syntax-badge success">Directly Constructed</div>
                                    </div>
                                    <div className="syntax-flow-canvas" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                        <ReactFlow
                                            nodes={dfaFlow.nodes}
                                            edges={dfaFlow.edges}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            nodesDraggable={false}
                                        >
                                            <Background color="#1e293b" gap={20} />
                                            <Controls showInteractive={false} />
                                        </ReactFlow>
                                    </div>
                                </motion.div>
                            )}

                            {/* Completion Summary - Only show in DFA stage */}
                            {activeStage !== 'config' && (
                                <motion.div
                                    className="syntax-rc-panel syntax-completion-summary mt-8"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <h4><Sparkles size={24} className="text-yellow-400" /> DFA Logic Synthesized</h4>
                                    <p className="mb-6 opacity-80">The augmented regex <code className="bg-white/10 px-2 py-1 rounded">`{regex}`</code> has been refined into a direct DFA.</p>
                                    <ul className="syntax-summary-list">
                                        <li>
                                            <CheckCircle2 size={20} className="text-emerald-400" />
                                            <span>Constructed <strong>{dfaResults?.dStates.length}</strong> unique DFA states.</span>
                                        </li>
                                        <li>
                                            <GitMerge size={20} className="text-indigo-400" />
                                            <span>Computed <strong>{dfaResults?.transitions.length}</strong> symbol transitions.</span>
                                        </li>
                                        <li>
                                            <Info size={20} className="text-blue-400" />
                                            <span>Identified <strong>{dfaResults?.dStates.filter(s => s.isAccept).length}</strong> terminal accept states.</span>
                                        </li>
                                    </ul>
                                </motion.div>
                            )}
                            <div className="syntax-bottom-spacer"></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SyntaxTreeDFA;
