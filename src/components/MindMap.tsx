import { useCallback, useEffect, useMemo } from "react";
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
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

export interface MindMapData {
  nodes: { id: string; label: string; level?: number }[];
  edges: { source: string; target: string }[];
}

const nodeWidth = 200;
const nodeHeight = 60;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

const levelColors = [
  "bg-primary text-primary-foreground",
  "bg-primary/80 text-primary-foreground",
  "bg-primary/60 text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

interface MindMapProps {
  data: MindMapData;
}

export default function MindMap({ data }: MindMapProps) {
  const initialNodes: Node[] = useMemo(
    () =>
      data.nodes.map((n) => ({
        id: n.id,
        data: { label: n.label },
        position: { x: 0, y: 0 },
        className: `rounded-xl border border-border shadow-sm px-4 py-2 text-xs font-medium ${
          levelColors[Math.min(n.level ?? 0, levelColors.length - 1)]
        }`,
        style: { width: nodeWidth, minHeight: nodeHeight },
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
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
      })),
    [data]
  );

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, "TB"),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(initialNodes, initialEdges, "TB");
    setNodes(ln);
    setEdges(le);
  }, [data]);

  return (
    <div className="h-[500px] w-full rounded-xl border border-border bg-card overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
      >
        <Controls className="!bg-card !border-border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
        <MiniMap
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  );
}
