import React, { useState, useEffect } from 'react';
import { Share2, Play, RotateCcw, ArrowLeft, Dices, Eraser, CheckCircle2, Sparkles, HelpCircle, Info, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ThompsonConstruction.css';
import { ReactFlow, Background, Controls, MarkerType, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import dagre from 'dagre';

// --- Custom Components ---
const NfaNode = ({ data, selected, id, className }) => {
    return (
        <div className={`nfa-node-container ${className || ''} ${selected ? 'selected' : ''}`}>
            <Handle type="target" position={Position.Left} className="nfa-handle" style={{ left: '0' }} />
            <div className="nfa-node-circle">
                {data.label}
            </div>
            <Handle type="source" position={Position.Right} className="nfa-handle" style={{ right: '0' }} />
        </div>
    );
};

const nodeTypes = {
    nfaNode: NfaNode,
};

// --- Regex Parsing and NFA Construction ---

const getPrecedence = (c) => {
    if (c === '*') return 3;
    if (c === '.') return 2;
    if (c === '|') return 1;
    return 0;
};

const insertExplicitConcat = (exp) => {
    let result = '';
    for (let i = 0; i < exp.length; i++) {
        let c1 = exp[i];
        result += c1;
        if (c1 === '(' || c1 === '|') continue;
        if (i < exp.length - 1) {
            let c2 = exp[i + 1];
            if (c2 === '*' || c2 === ')' || c2 === '|') continue;
            result += '.';
        }
    }
    return result;
};

const toPostfix = (exp) => {
    exp = insertExplicitConcat(exp);
    let output = '';
    const stack = [];
    for (let c of exp) {
        if (/[a-zA-Z0-9]/.test(c)) {
            output += c;
        } else if (c === '(') {
            stack.push(c);
        } else if (c === ')') {
            while (stack.length > 0 && stack[stack.length - 1] !== '(') {
                output += stack.pop();
            }
            stack.pop();
        } else {
            while (stack.length > 0 && getPrecedence(stack[stack.length - 1]) >= getPrecedence(c)) {
                output += stack.pop();
            }
            stack.push(c);
        }
    }
    while (stack.length > 0) output += stack.pop();
    return output;
};

class State {
    constructor(id) {
        this.id = id;
        this.transitions = [];
    }
}

class NFAFragment {
    constructor(start, accept) {
        this.start = start;
        this.accept = accept;
    }
}

const buildNFA = (postfix) => {
    let stateCounter = 1;
    const stack = [];

    if (!postfix) return null;

    try {
        for (let c of postfix) {
            if (/[a-zA-Z0-9]/.test(c)) {
                let s1 = new State(stateCounter++);
                let s2 = new State(stateCounter++);
                s1.transitions.push({ symbol: c, to: s2 });
                stack.push(new NFAFragment(s1, s2));
            } else if (c === '.') {
                if (stack.length < 2) return null;
                let nfa2 = stack.pop();
                let nfa1 = stack.pop();
                nfa1.accept.transitions.push({ symbol: 'ε', to: nfa2.start });
                stack.push(new NFAFragment(nfa1.start, nfa2.accept));
            } else if (c === '|') {
                if (stack.length < 2) return null;
                let nfa2 = stack.pop();
                let nfa1 = stack.pop();
                let start = new State(stateCounter++);
                let accept = new State(stateCounter++);
                start.transitions.push({ symbol: 'ε', to: nfa1.start });
                start.transitions.push({ symbol: 'ε', to: nfa2.start });
                nfa1.accept.transitions.push({ symbol: 'ε', to: accept });
                nfa2.accept.transitions.push({ symbol: 'ε', to: accept });
                stack.push(new NFAFragment(start, accept));
            } else if (c === '*') {
                if (stack.length < 1) return null;
                let nfa = stack.pop();
                let start = new State(stateCounter++);
                let accept = new State(stateCounter++);
                start.transitions.push({ symbol: 'ε', to: nfa.start });
                start.transitions.push({ symbol: 'ε', to: accept });
                nfa.accept.transitions.push({ symbol: 'ε', to: nfa.start });
                nfa.accept.transitions.push({ symbol: 'ε', to: accept });
                stack.push(new NFAFragment(start, accept));
            }
        }
        return stack.pop();
    } catch (e) {
        return null; // Invalid regex
    }
};

const getNFAStats = (nfa) => {
    if (!nfa) return { states: 0, transitions: 0, epsilons: 0 };
    const visited = new Set();
    const queue = [nfa.start];
    let states = 0;
    let transitions = 0;
    let epsilons = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        states++;
        for (let trans of current.transitions) {
            transitions++;
            if (trans.symbol === 'ε') epsilons++;
            queue.push(trans.to);
        }
    }
    return { states, transitions, epsilons };
};

const generateReactFlowElements = (nfa) => {
    if (!nfa) return { rNodes: [], rEdges: [] };

    const nodesMap = new Map();
    const rEdges = [];
    const queue = [nfa.start];
    const visited = new Set();

    let edgeCounter = 1;

    // Add a virtual "Start" arrow source
    const startArrowSourceId = 'start-arrow-source';

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        let nodeClass = 'nfa-node';
        if (current.id === nfa.start.id) nodeClass += ' start';
        if (current.id === nfa.accept.id) nodeClass += ' accept';

        nodesMap.set(current.id, {
            id: current.id.toString(),
            type: 'nfaNode', // Use the custom node type
            data: { label: current.id.toString() },
            className: nodeClass,
            position: { x: 0, y: 0 }
        });

        // If it's the start node, add an incoming "Start" arrow from left
        if (current.id === nfa.start.id) {
            rEdges.push({
                id: 'start-arrow',
                source: startArrowSourceId,
                target: current.id.toString(),
                type: 'straight',
                animated: false,
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-primary)' },
                style: { stroke: 'var(--accent-primary)', strokeWidth: 3 },
                // Hidden dummy node handling
            });
        }

        // Process all transitions regardless of target visitor status
        for (let trans of current.transitions) {
            let edgeId = `e${edgeCounter++}`;
            let color = '#8b949e';
            let strokeWidth = 2;
            if (trans.symbol !== 'ε') {
                color = 'var(--accent-primary)';
                strokeWidth = 3;
            }

            rEdges.push({
                id: edgeId,
                source: current.id.toString(),
                target: trans.to.id.toString(),
                label: trans.symbol,
                type: 'straight',
                markerEnd: { type: MarkerType.ArrowClosed, color: color },
                style: { stroke: color, strokeWidth: strokeWidth },
                labelStyle: { fill: '#fff', fontWeight: 600, fontSize: '15px' },
                labelBgStyle: { fill: 'transparent', fillOpacity: 0 },
                labelBgPadding: 0,
            });

            // Only push to queue if target hasn't been visited yet
            queue.push(trans.to);
        }
    }

    // Add hidden source node for the start arrow
    const nodesArray = Array.from(nodesMap.values());
    nodesArray.push({
        id: startArrowSourceId,
        type: 'input',
        data: { label: '' },
        position: { x: -100, y: 0 },
        style: { width: 0, height: 0, padding: 0, border: 'none', background: 'transparent', opacity: 0 },
    });

    return { rNodes: nodesArray, rEdges };
};

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        ranksep: 100,
        nodesep: 80,
        ranker: 'network-simplex' // Better for symmetric diamond shapes
    });

    nodes.forEach((node) => {
        // Dummy node for start arrow should be fixed
        const w = node.id === 'start-arrow-source' ? 1 : 100;
        const h = node.id === 'start-arrow-source' ? 1 : 100;
        dagreGraph.setNode(node.id, { width: w, height: h });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        const offset = node.id === 'start-arrow-source' ? 0 : 50;
        node.position = {
            x: nodePosition.x - offset,
            y: nodePosition.y - offset,
        };
    });

    // Manually push the start-arrow-source further left if needed
    const startArrow = nodes.find(n => n.id === 'start-arrow-source');
    const startNodeId = edges.find(e => e.id === 'start-arrow')?.target;
    const startNode = nodes.find(n => n.id === startNodeId);
    if (startArrow && startNode) {
        startArrow.position = { x: startNode.position.x - 80, y: startNode.position.y + 50 };
    }

    return { nodes, edges };
};

// --- Component ---

const ThompsonConstruction = () => {
    const [regex, setRegex] = useState('a|b');
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    const regexExamples = [
        '(a|b)*abb',
        'a(b|c)*',
        'a*b*',
        '(a|b|c)',
        'ab*c(d|e)'
    ];

    const loadExample = () => {
        const randomIdx = Math.floor(Math.random() * regexExamples.length);
        setRegex(regexExamples[randomIdx]);
    };

    // Graph State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const generateGraph = () => {
        setError('');
        try {
            if (!regex) {
                setNodes([]);
                setEdges([]);
                return;
            }

            const postfix = toPostfix(regex.replace(/\s+/g, ''));
            const builtNfa = buildNFA(postfix);

            if (!builtNfa) {
                setError('Invalid Regular Expression');
                return;
            }

            // --- Robust Source-Level Re-numbering ---
            const stateIdMap = new Map();
            let nextId = 0;
            const stateQueue = [builtNfa.start];
            const stateVisited = new Set();

            while (stateQueue.length > 0) {
                const state = stateQueue.shift();
                if (stateVisited.has(state)) continue;
                stateVisited.add(state);

                stateIdMap.set(state, nextId++);

                for (const trans of state.transitions) {
                    stateQueue.push(trans.to);
                }
            }

            // Apply final IDs to State objects permanently
            stateVisited.forEach(state => {
                state.id = stateIdMap.get(state);
            });

            // Now generate elements using the final state IDs
            const { rNodes, rEdges } = generateReactFlowElements(builtNfa);
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rNodes, rEdges);

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            setStats(getNFAStats(builtNfa));
        } catch (err) {
            console.error('NFA Error:', err);
            setError('Invalid Regular Expression syntax.');
        }
    };

    const handleSimulate = () => {
        setIsSimulating(true);
        generateGraph();
    };

    const handleReset = () => {
        setIsSimulating(false);
        setNodes([]);
        setEdges([]);
        setError('');
    };

    // Removed auto-load useEffect as per user request to only show graph on 'Generate' click

    return (
        <div className="unit-container">
            <div className="workspace-header">
                <h2>
                    <Link to="/unit1" className="back-link" title="Back to Unit I">
                        <ArrowLeft size={24} />
                    </Link>
                    <Share2 size={28} className="header-icon" />
                    Thompson Construction (RE to NFA)
                </h2>
                <p>Visualize the structural conversion of Regular Expressions to Non-Deterministic Finite Automata.</p>
            </div>

            <div className="glass-panel rc-panel">
                <div className="rc-input-group">
                    <div className="panel-header mb-4">
                        <h3>Regular Expression</h3>
                        {!isSimulating && (
                            <button className="btn-secondary action-btn header-btn" onClick={loadExample} title="Load different example">
                                <Dices size={16} /> Example Change
                            </button>
                        )}
                    </div>
                    {error && <div className="rc-error-text mb-2">{error}</div>}
                    <input
                        type="text"
                        value={regex}
                        onChange={(e) => setRegex(e.target.value)}
                        className="rc-input"
                        disabled={isSimulating}
                        placeholder="e.g. (a|b)*abb or a(b|c)"
                    />
                </div>
                <div className="actions-row mt-6">
                    {!isSimulating ? (
                        <button className="btn-primary rc-btn" onClick={handleSimulate}>
                            <Zap size={18} /> Generate NFA Map
                        </button>
                    ) : (
                        <button className="btn-secondary rc-btn" onClick={handleReset}>
                            <RotateCcw size={18} /> Clear & Edit
                        </button>
                    )}
                    <button className="btn-secondary rc-btn" onClick={() => { setRegex(''); setNodes([]); setEdges([]); setIsSimulating(false); }}>
                        <Eraser size={18} /> Input Clear
                    </button>
                </div>
            </div>

            {nodes.length > 0 && (
                <div className="glass-panel flow-panel">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-right"
                        nodesDraggable={!isLocked}
                        panOnDrag={!isLocked}
                        zoomOnScroll={false}
                        panOnScroll={false}
                        zoomOnPinch={!isLocked}
                        zoomOnDoubleClick={!isLocked}
                        className="nfa-react-flow"
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#30363d" gap={16} />
                        <Controls onInteractiveChange={(interactive) => setIsLocked(!interactive)} />
                    </ReactFlow>
                </div>
            )}

            {nodes.length > 0 && (
                <div className="glass-panel nfa-legend-panel">
                    <div className="nfa-legend-item">
                        <div className="legend-circle start-circle"></div>
                        <span className="legend-text">Start State</span>
                    </div>
                    <div className="nfa-legend-item">
                        <div className="legend-circle accept-circle"></div>
                        <span className="legend-text">Accepting State</span>
                    </div>
                    <div className="nfa-legend-item">
                        <div className="legend-line epsilon-line"></div>
                        <span className="legend-text">ε (Epsilon) Transition</span>
                    </div>
                    <div className="nfa-legend-item">
                        <div className="legend-line input-line"></div>
                        <span className="legend-text">Input Transition</span>
                    </div>
                </div>
            )}

            {
                isSimulating && stats && (
                    <motion.div
                        className="glass-panel completion-summary mt-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <h4><Sparkles size={24} className="text-yellow-400" /> NFA Synthesis Complete</h4>
                        <p className="mb-6 opacity-80">The Regular Expression <code className="bg-white/10 px-2 py-1 rounded">`{regex}`</code> has been successfully converted to an NFA structure.</p>
                        <ul className="summary-list">
                            <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <CheckCircle2 size={20} className="summary-icon" />
                                <span>The construction resulted in <strong>{stats.states}</strong> distinct states.</span>
                            </motion.li>
                            <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Zap size={20} className="summary-icon" />
                                <span>A total of <strong>{stats.transitions}</strong> transitions were created, including <strong>{stats.epsilons}</strong> epsilon (ε) moves.</span>
                            </motion.li>
                            <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Info size={20} className="summary-icon" />
                                <span>The <b>start</b> and <b>accept</b> states correctly encapsulate the RE logic using Thompson nodes.</span>
                            </motion.li>
                        </ul>
                    </motion.div>
                )
            }
        </div >
    );
};

export default ThompsonConstruction;
