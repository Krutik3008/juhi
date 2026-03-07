import React, { useState, useEffect } from 'react';
import { Share2, Play, RotateCcw } from 'lucide-react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import dagre from 'dagre';

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

const generateReactFlowElements = (nfa) => {
    if (!nfa) return { rNodes: [], rEdges: [] };

    const nodesMap = new Map();
    const rEdges = [];
    const queue = [nfa.start];
    const visited = new Set();

    let edgeCounter = 1;

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        let nodeClass = 'nfa-node';
        let label = current.id.toString();

        if (current.id === nfa.start.id) {
            nodeClass += ' start';
            label += ' (Start)';
        }
        if (current.id === nfa.accept.id) {
            nodeClass += ' accept';
            label += ' (Accept)';
        }

        nodesMap.set(current.id, {
            id: current.id.toString(),
            data: { label: label },
            className: nodeClass,
            position: { x: 0, y: 0 } // Handled by dagre
        });

        for (let trans of current.transitions) {
            let edgeId = `e${edgeCounter++}`;

            let color = '#8b949e';
            let strokeWidth = 1;
            if (trans.symbol !== 'ε') {
                color = 'var(--accent-primary)';
                if (trans.symbol === 'b') color = 'var(--success)';
                if (trans.symbol === 'c') color = 'var(--warning)';
                strokeWidth = 2;
            }

            rEdges.push({
                id: edgeId,
                source: current.id.toString(),
                target: trans.to.id.toString(),
                label: trans.symbol,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: color },
                style: { stroke: color, strokeWidth }
            });
            queue.push(trans.to);
        }
    }

    return { rNodes: Array.from(nodesMap.values()), rEdges };
};

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 50, height: 50 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        node.position = {
            x: nodePosition.x - 25,
            y: nodePosition.y - 25,
        };
    });

    return { nodes, edges };
};

// --- Component ---

const ThompsonConstruction = () => {
    const [regex, setRegex] = useState('(a|b)*abb');
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState('');

    // Graph State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const generateGraph = () => {
        setError('');
        if (!regex) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const postfix = toPostfix(regex.replace(/\s+/g, ''));
        const nfa = buildNFA(postfix);

        if (!nfa) {
            setError('Invalid Regular Expression');
            return;
        }

        const { rNodes, rEdges } = generateReactFlowElements(nfa);
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rNodes, rEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
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

    // Pre-load default template if un-simulated (to match purely visual prior design)
    useEffect(() => {
        if (!isSimulating && nodes.length === 0) {
            const postfix = toPostfix('(a|b)*abb');
            const nfa = buildNFA(postfix);
            if (nfa) {
                const { rNodes, rEdges } = generateReactFlowElements(nfa);
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rNodes, rEdges);
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
            }
        }
    }, [isSimulating, nodes.length]);

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Share2 size={24} className="inline-block mr-2" />Thompson Construction (RE to NFA)</h2>
                <p>Visualize the structural conversion of Regular Expressions to Non-Deterministic Finite Automata.</p>
            </div>

            <div className="glass-panel mt-6 flex gap-4 p-4 items-end">
                <div className="flex-1">
                    <label className="text-sm text-muted mb-2 block flex justify-between">
                        <span>Regular Expression</span>
                        {error && <span className="text-red-400 font-bold">{error}</span>}
                    </label>
                    <input
                        type="text"
                        value={regex}
                        onChange={(e) => setRegex(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white font-mono"
                        disabled={isSimulating}
                        placeholder="e.g. (a|b)*abb or a(b|c)"
                    />
                </div>
                {!isSimulating ? (
                    <button className="btn-primary mb-[2px]" onClick={handleSimulate}>
                        <Play size={18} /> Generate NFA Map
                    </button>
                ) : (
                    <button className="btn-secondary mb-[2px]" onClick={handleReset}>
                        <RotateCcw size={18} /> Clear & Edit
                    </button>
                )}
            </div>

            <div className="glass-panel mt-6 relative" style={{ height: '500px' }}>
                <style>
                    {`
                        .nfa-node {
                            background: var(--bg-secondary);
                            border: 2px solid var(--border-color);
                            border-radius: 50%;
                            width: 50px;
                            height: 50px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        }
                        .nfa-node.start {
                            border-color: var(--accent-primary);
                            box-shadow: 0 0 15px rgba(88, 166, 255, 0.3);
                        }
                        .nfa-node.accept {
                            border-width: 4px;
                            border-color: var(--success);
                            box-shadow: 0 0 15px rgba(63, 185, 80, 0.3);
                        }
                        .react-flow__edge-path {
                            stroke: #8b949e;
                        }
                        .react-flow__edge-text {
                            fill: white;
                            font-size: 14px;
                            font-weight: bold;
                        }
                        .react-flow__edge-textbg {
                            fill: var(--bg-tertiary);
                            rx: 4;
                            ry: 4;
                        }
                    `}
                </style>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    fitView
                    attributionPosition="bottom-right"
                    nodesDraggable={true}
                >
                    <Background color="#30363d" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>

            <div className="flex gap-6 justify-center mt-6 p-4 glass-panel flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-primary)] bg-transparent"></div>
                    <span className="text-sm">Start State</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-4 border-[var(--success)] bg-transparent"></div>
                    <span className="text-sm">Accepting State</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-[var(--text-muted)]"></div>
                    <span className="text-sm">ε (Epsilon) Transition</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-[var(--accent-primary)]"></div>
                    <span className="text-sm">Input Transition</span>
                </div>
            </div>
        </div>
    );
};

export default ThompsonConstruction;
