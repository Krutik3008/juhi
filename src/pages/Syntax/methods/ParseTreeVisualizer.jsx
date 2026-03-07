import React, { useState, useEffect } from 'react';
import { AlignLeft, Play, RotateCcw } from 'lucide-react';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { motion } from 'framer-motion';

// --- Dynamic Parser ---
const tokenize = (input) => {
    const tokens = [];
    const regex = /\s*([a-zA-Z_]\w*|\d+(?:\.\d+)?|==|!=|<=|>=|&&|\|\||[+\-*\/=();])\s*/g;
    let match;
    let lastIndex = 0;
    while ((match = regex.exec(input)) !== null) {
        if (match.index !== lastIndex) {
            // Unrecognized character skipped
        }
        lastIndex = regex.lastIndex;
        if (match[1]) tokens.push(match[1]);
    }
    return tokens;
};

const buildParseTree = (input) => {
    let tokens = tokenize(input);
    let current = 0;
    let rNodes = [];
    let rEdges = [];
    let idCounter = 1;

    function peek() { return tokens[current]; }
    function consume() { return tokens[current++]; }

    function makeNode(label, className) {
        let id = (idCounter++).toString();
        rNodes.push({ id, data: { label }, className: `tree-node ${className}`, position: { x: 0, y: 0 } });
        return id;
    }

    function makeEdge(source, target) {
        rEdges.push({
            id: `e${source}-${target}`,
            source,
            target,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' },
            style: { stroke: '#8b949e', strokeWidth: 2 }
        });
    }

    function parseStmt() {
        if (current >= tokens.length) return null;
        if (tokens.length > current + 1 && tokens[current + 1] === '=') {
            let idLabel = consume();
            let eq = consume();
            let expr = parseExpr();
            let S = makeNode('Stmt', 'non-terminal');
            let idNode = makeNode(idLabel, 'terminal lexeme');

            makeEdge(S, idNode);
            makeEdge(S, makeNode(eq, 'operator'));
            if (expr) makeEdge(S, expr);
            return S;
        }
        return parseExpr();
    }

    function parseExpr() {
        let left = parseTerm();
        if (!left) return null;
        while (peek() === '+' || peek() === '-') {
            let op = consume();
            let right = parseTerm();
            let root = makeNode('Expr', 'non-terminal');
            makeEdge(root, left);
            makeEdge(root, makeNode(op, 'operator'));
            if (right) makeEdge(root, right);
            left = root;
        }
        let e = makeNode('Expr', 'non-terminal');
        makeEdge(e, left);
        return e;
    }

    function parseTerm() {
        let left = parseFactor();
        if (!left) return null;
        while (peek() === '*' || peek() === '/') {
            let op = consume();
            let right = parseFactor();
            let root = makeNode('Term', 'non-terminal');
            makeEdge(root, left);
            makeEdge(root, makeNode(op, 'operator'));
            if (right) makeEdge(root, right);
            left = root;
        }
        let t = makeNode('Term', 'non-terminal');
        makeEdge(t, left);
        return t;
    }

    function parseFactor() {
        let t = peek();
        if (!t) return null;
        let f = makeNode('Factor', 'non-terminal');

        if (t === '(') {
            makeEdge(f, makeNode(consume(), 'operator'));
            let expr = parseExpr();
            if (expr) makeEdge(f, expr);
            if (peek() === ')') makeEdge(f, makeNode(consume(), 'operator'));
        } else {
            let val = consume();
            let cls = isNaN(val) ? 'terminal lexeme' : 'terminal lexeme';
            makeEdge(f, makeNode(val, cls));
        }
        return f;
    }

    parseStmt();

    return { rNodes, rEdges };
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 40 });

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

// --- Component ---

const ParseTreeVisualizer = () => {
    const [expression, setExpression] = useState("position = initial + rate * 60");
    const [isSimulating, setIsSimulating] = useState(false);

    // Graph State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const generateGraph = () => {
        if (!expression) {
            setNodes([]); setEdges([]); return;
        }
        const { rNodes, rEdges } = buildParseTree(expression);
        if (rNodes.length === 0) return;

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
    };

    // Pre-load default state
    useEffect(() => {
        if (!isSimulating && nodes.length === 0) {
            const { rNodes, rEdges } = buildParseTree("id + id * id");
            const { nodes: lNodes, edges: lEdges } = getLayoutedElements(rNodes, rEdges);
            setNodes(lNodes);
            setEdges(lEdges);
        }
    }, [isSimulating, nodes.length]);

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><AlignLeft size={24} className="inline-block mr-2" />Parse Tree Construction</h2>
                <p>Visualize how the parser derives a string using the grammar rules (Bottom-up or Top-down).</p>
            </div>

            <div className="glass-panel mt-6 flex gap-4 p-4 items-end">
                <div className="flex-1">
                    <label className="text-sm text-muted mb-2 block flex justify-between">
                        <span>Expression</span>
                    </label>
                    <input
                        type="text"
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white font-mono"
                        disabled={isSimulating}
                        placeholder="e.g. current = old + offset * 2"
                    />
                </div>
                {!isSimulating ? (
                    <button className="btn-primary mb-[2px]" onClick={handleSimulate}>
                        <Play size={18} /> Build Tree
                    </button>
                ) : (
                    <button className="btn-secondary mb-[2px]" onClick={handleReset}>
                        <RotateCcw size={18} /> Reset
                    </button>
                )}
            </div>

            <div className="glass-panel mt-6 relative" style={{ height: '500px' }}>
                <style>
                    {`
                        .tree-node {
                            border-radius: 8px;
                            width: 60px;
                            height: 60px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 16px;
                            font-family: var(--font-mono);
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        }
                        .tree-node.non-terminal {
                            background: rgba(88, 166, 255, 0.1);
                            border: 2px solid var(--accent-primary);
                            color: var(--accent-primary);
                        }
                        .tree-node.terminal {
                            border-radius: 50%;
                        }
                        .tree-node.operator {
                            background: rgba(210, 168, 255, 0.1);
                            border: 2px dashed #d2a8ff;
                            color: #d2a8ff;
                            font-size: 24px;
                        }
                        .tree-node.lexeme {
                            background: rgba(63, 185, 80, 0.1);
                            border: 2px solid var(--success);
                            color: var(--success);
                            font-size: 14px;
                            box-shadow: 0 0 15px rgba(63, 185, 80, 0.2);
                            word-break: break-all;
                            text-align: center;
                            padding: 2px;
                        }
                        .react-flow__edge-path {
                            stroke: #8b949e;
                            stroke-width: 2;
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
                    <div className="w-6 h-6 rounded border-2 border-[var(--accent-primary)] bg-[rgba(88,166,255,0.1)]"></div>
                    <span className="text-sm">Non-Terminal (Stmt, Expr, Term, Factor)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#d2a8ff] bg-[rgba(210,168,255,0.1)]"></div>
                    <span className="text-sm">Terminal Operator</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--success)] bg-[rgba(63,185,80,0.1)] shadow-[0_0_10px_rgba(63,185,80,0.4)]"></div>
                    <span className="text-sm">Terminal Lexeme (Identifier, Number)</span>
                </div>
                {isSimulating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 ml-4 border-l border-gray-700 pl-4 py-1">
                        <span className="text-sm text-muted">Leftmost Derivation shown. Yields: <strong className="text-white font-mono ml-2">{expression}</strong></span>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ParseTreeVisualizer;
