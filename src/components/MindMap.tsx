import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionLineType,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

export interface MindMapData {
  nodes: { id: string; label: string; level?: number }[];
  edges: { source: string; target: string }[];
}

const nodeWidth = 220;
const nodeHeight = 50;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const level = (node.data as any).level ?? 0;
    const w = level === 0 ? 260 : nodeWidth;
    const h = level === 0 ? 60 : nodeHeight;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const level = (node.data as any).level ?? 0;
    const w = level === 0 ? 260 : nodeWidth;
    const h = level === 0 ? 60 : nodeHeight;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

const levelStyles = [
  { bg: "hsl(var(--primary))", text: "#fff", border: "hsl(var(--primary))", fontSize: 15, fontWeight: 700, radius: 16 },
  { bg: "hsl(var(--primary) / 0.15)", text: "hsl(var(--primary))", border: "hsl(var(--primary) / 0.4)", fontSize: 13, fontWeight: 600, radius: 12 },
  { bg: "hsl(var(--accent))", text: "hsl(var(--accent-foreground))", border: "hsl(var(--border))", fontSize: 12, fontWeight: 500, radius: 10 },
  { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))", border: "hsl(var(--border))", fontSize: 11, fontWeight: 400, radius: 8 },
];

function CustomNode({ data }: NodeProps) {
  const level = (data as any).level ?? 0;
  const style = levelStyles[Math.min(level, levelStyles.length - 1)];
  const isRoot = level === 0;

  return (
    <div
      style={{
        background: style.bg,
        color: style.text,
        border: `2px solid ${style.border}`,
        borderRadius: style.radius,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        padding: isRoot ? "12px 24px" : "8px 16px",
        textAlign: "center",
        width: isRoot ? 260 : nodeWidth,
        minHeight: isRoot ? 60 : nodeHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isRoot
          ? "0 4px 20px hsl(var(--primary) / 0.25)"
          : "0 2px 8px hsl(var(--foreground) / 0.06)",
        transition: "box-shadow 0.2s, transform 0.2s",
        lineHeight: 1.3,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <span>{String(data.label)}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

interface MindMapProps {
  data: MindMapData;
}

export default function MindMap({ data }: MindMapProps) {
  const [direction, setDirection] = useState<"TB" | "LR">("LR");

  const initialNodes: Node[] = useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        type: "custom",
        data: { label: n.label, level: n.level ?? 0 },
        position: { x: 0, y: 0 },
      })),
    [data]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      data.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: false,
        style: { stroke: "hsl(var(--primary) / 0.5)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.5)", width: 16, height: 16 },
      })),
    [data]
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, direction),
    [initialNodes, initialEdges, direction]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, initialEdges, direction);
    setNodes(ln);
    setEdges(le);
  }, [data, direction]);

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button
          onClick={() => setDirection("LR")}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${direction === "LR" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}
        >
          Horizontal
        </button>
        <button
          onClick={() => setDirection("TB")}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${direction === "TB" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"}`}
        >
          Vertical
        </button>
      </div>
      <div className="h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-left"
          minZoom={0.3}
          maxZoom={2}
        >
          <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
          <MiniMap
            nodeColor="hsl(var(--primary) / 0.6)"
            maskColor="hsl(var(--background) / 0.8)"
            className="!bg-card !border-border"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
