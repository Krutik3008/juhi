import React, { useState, useEffect } from 'react';
import { Search, Play, RotateCcw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, Background, Controls, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

// --- Type Inference AST Builder ---
const buildTypedAST = (code) => {
    let nodes = [];
    let edges = [];
    let steps = [];
    let idCounter = 1;

    // Simple parser for: [type] id = expr;
    // Removing semicolons
    const cleanCode = code.replace(/;/g, '').trim();
    const parts = cleanCode.split('=');

    if (parts.length < 2) {
        return { nodes: [], edges: [], steps: [{ desc: 'Error', infer: 'none', action: 'Invalid assignment statement.' }] };
    }

    let lhs = parts[0].trim().split(/\s+/);
    let declaredType = lhs.length > 1 ? lhs[0] : 'float'; // Default float
    let varName = lhs.length > 1 ? lhs[1] : lhs[0];

    let rhs = parts.slice(1).join('=').trim();
    let tokens = rhs.split(/\s+/);

    const createLeaf = (token) => {
        let inferType = 'unknown';
        if (/^\d+\.\d+$/.test(token)) inferType = 'real';
        else if (/^\d+$/.test(token)) inferType = 'int';
        else if (/^[a-zA-Z_]\w*$/.test(token)) inferType = 'float'; // Assume identifiers are float

        let id = (idCounter++).toString();
        nodes.push({ id, data: { label: token, type: inferType, coerced: false }, className: 'ast-node leaf', position: { x: 0, y: 0 } });
        steps.push({ desc: `Analyzing node: \`${token}\``, infer: inferType, action: `Literal/Identifier detected.` });
        return { id, type: inferType };
    };

    let rootId = null;
    let rootType = null;

    if (tokens.length === 3) {
        let leftToken = tokens[0];
        let op = tokens[1];
        let rightToken = tokens[2];

        let leftLeaf = createLeaf(leftToken);
        let rightLeaf = createLeaf(rightToken);

        rootId = (idCounter++).toString();

        // Coercion logic
        if (leftLeaf.type === 'int' && rightLeaf.type === 'real') {
            rootType = 'real';
            nodes.find(n => n.id === leftLeaf.id).data.coerced = 'intToReal';
            steps.push({ desc: `Analyzing node: \`${op}\``, infer: 'real', action: `int ${op} real -> Coercing \`${leftToken}\` to real. Result type is real.` });
        } else if (leftLeaf.type === 'real' && rightLeaf.type === 'int') {
            rootType = 'real';
            nodes.find(n => n.id === rightLeaf.id).data.coerced = 'intToReal';
            steps.push({ desc: `Analyzing node: \`${op}\``, infer: 'real', action: `real ${op} int -> Coercing \`${rightToken}\` to real. Result type is real.` });
        } else {
            rootType = leftLeaf.type; // Best effort
            steps.push({ desc: `Analyzing node: \`${op}\``, infer: rootType, action: `${leftLeaf.type} ${op} ${rightLeaf.type} -> No coercion needed. Result type is ${rootType}.` });
        }

        nodes.push({ id: rootId, data: { label: op, type: rootType }, className: 'ast-node op', position: { x: 0, y: 0 } });
        edges.push({ id: `e${rootId}-${leftLeaf.id}`, source: rootId, target: leftLeaf.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' } });
        edges.push({ id: `e${rootId}-${rightLeaf.id}`, source: rootId, target: rightLeaf.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' } });

    } else if (tokens.length === 1) {
        let leaf = createLeaf(tokens[0]);
        rootId = leaf.id;
        rootType = leaf.type;
    } else {
        return { nodes: [], edges: [], steps: [{ desc: 'Error', infer: 'none', action: 'Complex RHS not fully supported in simple demo.' }] };
    }

    // Assignment Node
    steps.push({ desc: `Analyzing node: \`${varName}\``, infer: declaredType, action: `Symbol table lookup. Identifier declared as ${declaredType}.` });

    let assignId = (idCounter++).toString();
    let assignType = 'void';
    let varId = (idCounter++).toString();

    nodes.push({ id: varId, data: { label: varName, type: declaredType }, className: 'ast-node leaf', position: { x: 0, y: 0 } });
    nodes.push({ id: assignId, data: { label: '=', type: assignType }, className: 'ast-node op root', position: { x: 0, y: 0 } });

    edges.push({ id: `e${assignId}-${varId}`, source: assignId, target: varId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' } });
    edges.push({ id: `e${assignId}-${rootId}`, source: assignId, target: rootId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#8b949e' } });

    // Final check
    let valid = false;
    if (declaredType === rootType || (declaredType === 'float' && rootType === 'real')) {
        valid = true;
        steps.push({ desc: `Analyzing node: \`=\``, infer: 'void', action: `LHS (${declaredType}) = RHS (${rootType}). Types match. Assignment valid.` });
    } else {
        steps.push({ desc: `Analyzing node: \`=\``, infer: 'error', action: `LHS (${declaredType}) = RHS (${rootType}). TYPE MISMATCH ERROR!` });
    }

    // Custom nodes array mapped to ReactFlow nodes
    return { nodes, edges, steps, valid };
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: 60, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 80, height: 80 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodePosition = dagreGraph.node(node.id);
        node.position = { x: nodePosition.x - 40, y: nodePosition.y - 40 };
    });

    return { nodes, edges };
};

// Custom Node for ReactFlow
const TypeNode = ({ data }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center w-20 h-20 rounded shadow-md border-2 ${data.label === '=' ? 'bg-gray-800 border-green-500 rounded-full' : (data.type === 'void' ? 'bg-gray-800 border-gray-600' : 'bg-gray-800 border-blue-500')}`}>
            <span className={`text-xl font-bold text-white mb-1 ${data.label === '=' ? 'text-2xl' : ''}`}>{data.label}</span>
            <span className="text-[10px] text-[var(--accent-primary)] font-mono bg-blue-900/30 px-2 py-0.5 rounded">{data.type}</span>
            {data.coerced && (
                <div className="absolute -left-12 -top-4 text-[10px] text-warning bg-yellow-900/40 px-1.5 py-0.5 rounded border border-yellow-700/50 whitespace-nowrap z-50">
                    {data.coerced}
                </div>
            )}
        </div>
    );
};

const nodeTypes = { custom: TypeNode };

const TypeChecker = () => {
    const [expression, setExpression] = useState('float rate = 60 * 1.5;');
    const [isSimulating, setIsSimulating] = useState(false);
    const [step, setStep] = useState(0);
    const [graph, setGraph] = useState({ nodes: [], edges: [], steps: [], valid: false });

    useEffect(() => {
        try {
            const { nodes, edges, steps, valid } = buildTypedAST(expression);

            // Map our nodes to the custom nodeType
            const mappedNodes = nodes.map(n => ({
                ...n,
                type: 'custom',
                style: { opacity: 0 } // hidden initially for animation
            }));

            const layouted = getLayoutedElements(mappedNodes, edges);
            setGraph({ nodes: layouted.nodes, edges: layouted.edges, steps, valid });
        } catch (e) {
            setGraph({ nodes: [], edges: [], steps: [{ desc: 'Parser Error', infer: 'error', action: 'Failed to parse statement.' }], valid: false });
        }
    }, [expression]);

    const handleSimulate = () => {
        if (graph.steps.length === 0) return;
        setIsSimulating(true);
        setStep(0);

        const interval = setInterval(() => {
            setStep(s => {
                if (s >= graph.steps.length - 1) {
                    clearInterval(interval);
                    return graph.steps.length;
                }
                return s + 1;
            });
        }, 1200);
    };

    const handleReset = () => {
        setIsSimulating(false);
        setStep(0);
    };

    // Make nodes visible based on steps
    // Step roughly maps to nodes in reverse order of creation (bottom-up validation)
    const visibleNodes = graph.nodes.map((n, i) => {
        // Node visibility strategy based on simple step progress
        // Total steps = number of actions. We reveal progressively from leaves to root.
        let visible = false;

        if (step > 0) {
            // Leaf literals visible early
            if (n.data.label !== '=' && n.data.label !== expression.split('=')[0].split(/\s+/).pop() && ['+', '-', '*', '/'].indexOf(n.data.label) === -1) {
                visible = true; // Literals
            }
            if (step > 2 && ['+', '-', '*', '/'].indexOf(n.data.label) > -1) visible = true; // Operator
            if (step > 3 && n.data.label === expression.split('=')[0].split(/\s+/).pop()) visible = true; // LHS id
            if (step > 4 && n.data.label === '=') visible = true; // Root
        }

        // At the end, everything is visible
        if (step >= graph.steps.length) visible = true;

        return { ...n, style: { opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' } };
    });

    return (
        <div className="simulation-workspace">
            <div className="workspace-header">
                <h2><Search size={24} className="inline-block mr-2" />Semantic Analysis & Type Checking</h2>
                <p>Traverse the syntax tree dynamically, infer types, and apply coercion rules for type safety. Now supporting dynamic input!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="glass-panel p-6 flex flex-col h-[600px]">
                    <h3>Type Checking Engine</h3>
                    <p className="text-sm text-muted mb-4">Dynamically parsing and validating statements.</p>

                    <div className="bg-gray-900 border border-gray-700 rounded p-4 mb-6">
                        <label className="text-xs text-muted mb-1 block">Statement to check (e.g., float x = 5 * 2.5):</label>
                        <input
                            type="text"
                            className="w-full bg-transparent text-accent font-mono text-lg border-none focus:outline-none"
                            value={expression}
                            onChange={e => { setExpression(e.target.value); setStep(0); setIsSimulating(false); }}
                            disabled={isSimulating}
                        />
                    </div>

                    <div className="flex gap-4 mb-8">
                        {!isSimulating ? (
                            <button className="btn-primary flex-1 flex justify-center items-center gap-2" onClick={handleSimulate}>
                                <Play size={18} /> Run Semantic Analysis
                            </button>
                        ) : (
                            <button className="btn-secondary flex-1 flex justify-center items-center gap-2" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset Engine
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {step > 0 && <h4>Verification Log</h4>}
                        <AnimatePresence>
                            {graph.steps.slice(0, step).map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-3 rounded border text-sm ${(i === graph.steps.length - 1 && graph.valid) ? 'bg-green-900/20 border-green-500/30' : (s.infer === 'error' ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800/50 border-gray-700')}`}
                                >
                                    <div className="font-mono text-white mb-1">{s.desc}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${s.infer === 'error' ? 'text-white bg-red-600' : 'text-accent bg-blue-900/30'}`}>Inferred: {s.infer}</span>
                                        <span className={s.infer === 'error' ? 'text-red-400 font-bold text-xs' : 'text-gray-400 text-xs'}>{s.action}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="glass-panel p-2 relative overflow-hidden" style={{ height: '600px', width: '100%' }}>
                    <h4 className="absolute top-4 left-4 z-10 font-mono text-white bg-gray-900/80 px-4 py-2 rounded-lg border border-gray-700">
                        Dynamically Typed AST
                    </h4>

                    {step === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted z-20 pointer-events-none">
                            <Search size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Run the simulation to watch the AST get constructed and typed.</p>
                        </div>
                    ) : null}

                    <style>{` .react-flow__edge-path { stroke: #8b949e; stroke-width: 2; } `}</style>

                    <ReactFlow
                        nodes={visibleNodes}
                        edges={graph.edges}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-right"
                    >
                        <Background color="#30363d" gap={16} />
                        <Controls />
                    </ReactFlow>

                    {step >= graph.steps.length && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`absolute bottom-8 left-8 right-8 p-4 rounded flex items-center gap-4 border z-20 ${graph.valid ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-red-900/20 border-red-500/50 text-red-400'}`}
                        >
                            {graph.valid ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                            <div>
                                <h4 className="font-bold">{graph.valid ? 'Semantic Verification Passed' : 'Semantic Error Detected'}</h4>
                                <p className="text-sm opacity-80">{graph.valid ? 'Types are compatible (using coercion where necessary).' : 'Type mismatch prevents assignment.'}</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TypeChecker;
