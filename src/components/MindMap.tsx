import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
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
import { toPng } from "html-to-image";
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
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const level = (node.data as any).level ?? 0;
    const w = level === 0 ? 280 : nodeWidth;
    const h = level === 0 ? 64 : nodeHeight;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const level = (node.data as any).level ?? 0;
    const w = level === 0 ? 280 : nodeWidth;
    const h = level === 0 ? 64 : nodeHeight;
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/* Color palette using concrete colors derived from our design tokens */
const levelPalette = [
  { bg: "#1a5fb4", text: "#ffffff", border: "#1a5fb4", shadow: "rgba(26,95,180,0.35)", fontSize: 16, fontWeight: 700, radius: 18 },
  { bg: "#dbeafe", text: "#1a5fb4", border: "#93c5fd", shadow: "rgba(26,95,180,0.12)", fontSize: 13, fontWeight: 600, radius: 14 },
  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d", shadow: "rgba(180,130,26,0.10)", fontSize: 12, fontWeight: 600, radius: 12 },
  { bg: "#f3f4f6", text: "#4b5563", border: "#d1d5db", shadow: "rgba(0,0,0,0.06)", fontSize: 11, fontWeight: 500, radius: 10 },
];

function CustomNode({ data }: NodeProps) {
  const level = (data as any).level ?? 0;
  const dir: "LR" | "TB" = (data as any).direction ?? "LR";
  const p = levelPalette[Math.min(level, levelPalette.length - 1)];
  const isRoot = level === 0;
  const w = isRoot ? 280 : nodeWidth;

  const targetPos = dir === "LR" ? Position.Left : Position.Top;
  const sourcePos = dir === "LR" ? Position.Right : Position.Bottom;

  return (
    <div
      style={{
        background: isRoot
          ? "linear-gradient(135deg, #1a5fb4 0%, #3b82f6 100%)"
          : p.bg,
        color: p.text,
        border: `2px solid ${p.border}`,
        borderRadius: p.radius,
        fontSize: p.fontSize,
        fontWeight: p.fontWeight,
        padding: isRoot ? "14px 28px" : "8px 16px",
        textAlign: "center",
        width: w,
        minHeight: isRoot ? 64 : nodeHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 4px 16px ${p.shadow}`,
        transition: "box-shadow 0.2s, transform 0.2s",
        lineHeight: 1.35,
        cursor: "grab",
      }}
    >
      <Handle
        type="target"
        position={targetPos}
        style={{ background: p.border, width: 6, height: 6, border: "none", opacity: 0.6 }}
      />
      <span style={{ wordBreak: "break-word" }}>{String(data.label)}</span>
      <Handle
        type="source"
        position={sourcePos}
        style={{ background: p.border, width: 6, height: 6, border: "none", opacity: 0.6 }}
      />
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

export interface MindMapHandle {
  exportPng: () => Promise<void>;
}

interface MindMapProps {
  data: MindMapData;
}

const MindMap = forwardRef<MindMapHandle, MindMapProps>(function MindMap({ data }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<"TB" | "LR">("LR");

  const initialNodes: Node[] = useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        type: "custom",
        data: { label: n.label, level: n.level ?? 0, direction },
        position: { x: 0, y: 0 },
      })),
    [data, direction]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      data.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: false,
        style: { stroke: "#93c5fd", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6", width: 14, height: 14 },
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
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            direction === "LR"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          }`}
        >
          ↔ Horizontal
        </button>
        <button
          onClick={() => setDirection("TB")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            direction === "TB"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          }`}
        >
          ↕ Vertical
        </button>
      </div>
      <div className="h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
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
          minZoom={0.2}
          maxZoom={2.5}
        >
          <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(255,255,255,0.85)"
            className="!bg-card !border-border !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
