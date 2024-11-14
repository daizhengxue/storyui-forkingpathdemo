import React, { useEffect, useRef, useState } from 'react';
import { useDialogueStore } from '../store/dialogueStore';
import { TimelineNode } from './TimelineNode';
import { TimelineConnector } from './TimelineConnector';

interface NodePosition {
  x: number;
  y: number;
}

interface DraggingState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ViewPort {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const HORIZONTAL_SPACING = 400;
const VERTICAL_SPACING = 300;
const BRANCH_OFFSET = 200;

export const TimelineVisualizer: React.FC = () => {
  const { nodes, currentState, navigate, jumpToTimeline, updateSystemPrompt } = useDialogueStore();
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeNodePath, setActiveNodePath] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState<ViewPort>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });

  // Calculate node levels and organize nodes by level
  const calculateNodeLevels = () => {
    const levels = new Map<string, number>();
    const nodesToProcess = ['root'];
    levels.set('root', 0);

    while (nodesToProcess.length > 0) {
      const currentId = nodesToProcess.shift()!;
      const currentLevel = levels.get(currentId)!;

      // Find all children of current node
      Array.from(nodes.values())
        .filter(node => node.parentId === currentId)
        .forEach(childNode => {
          levels.set(childNode.id, currentLevel + 1);
          nodesToProcess.push(childNode.id);
        });
    }

    return levels;
  };

  // Calculate branch index for each node at the same level
  const calculateBranchIndices = (levels: Map<string, number>) => {
    const branchIndices = new Map<string, number>();
    const levelGroups = new Map<number, string[]>();

    // Group nodes by level
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    });

    // Assign branch indices within each level
    levelGroups.forEach(nodesInLevel => {
      nodesInLevel.forEach((nodeId, index) => {
        branchIndices.set(nodeId, index);
      });
    });

    return branchIndices;
  };

  useEffect(() => {
    const levels = calculateNodeLevels();
    const branchIndices = calculateBranchIndices(levels);

    setNodePositions(new Map(Array.from(nodes.keys()).map(nodeId => {
      const level = levels.get(nodeId) || 0;
      const branchIndex = branchIndices.get(nodeId) || 0;
      const node = nodes.get(nodeId)!;

      let x = 400 + level * HORIZONTAL_SPACING;
      let y = 300;

      if (nodeId !== 'root') {
        if (node.metadata.branchType === 'alternate') {
          y += VERTICAL_SPACING * branchIndex;
        } else if (node.metadata.branchType === 'merged') {
          y -= VERTICAL_SPACING * 0.5;
        } else {
          y += BRANCH_OFFSET * branchIndex;
        }
      }

      return [nodeId, { x, y }];
    })));
  }, [nodes]);

  useEffect(() => {
    const path = new Set<string>();
    let currentNode = nodes.get(currentState.currentNodeId);
    while (currentNode) {
      path.add(currentNode.id);
      currentNode = currentNode.parentId ? nodes.get(currentNode.parentId) : undefined;
    }
    setActiveNodePath(path);
  }, [currentState.currentNodeId, nodes]);

  const handleDragStart = (nodeId: string, e: React.DragEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragging({
      nodeId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!dragging || !containerRef.current) return;
    if (e.clientX === 0 && e.clientY === 0) return;

    setNodePositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(dragging.nodeId, {
        x: e.clientX,
        y: e.clientY
      });
      return newPositions;
    });
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleSystemPromptEdit = (content: string) => {
    updateSystemPrompt(content);
  };

  const renderConnectors = () => {
    const connectors: JSX.Element[] = [];
    nodes.forEach((node, nodeId) => {
      if (nodeId !== 'root' && node.parentId) {
        const startPos = nodePositions.get(node.parentId);
        const endPos = nodePositions.get(nodeId);
        if (startPos && endPos) {
          connectors.push(
            <TimelineConnector
              key={`${node.parentId}-${nodeId}`}
              start={startPos}
              end={endPos}
              isActive={activeNodePath.has(node.parentId) && activeNodePath.has(nodeId)}
              targetNode={node}
            />
          );
        }
      }
    });
    return connectors;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY;
    const newScale = viewport.scale * (1 + delta * zoomSensitivity);
    const scale = Math.min(Math.max(newScale, 0.1), 3);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newOffsetX = mouseX - (mouseX - viewport.offsetX) * (scale / viewport.scale);
    const newOffsetY = mouseY - (mouseY - viewport.offsetY) * (scale / viewport.scale);
    
    setViewport({ scale, offsetX: newOffsetX, offsetY: newOffsetY });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.timeline-node')) return;
    setIsDraggingCanvas(true);
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    
    const deltaX = e.clientX - lastMousePosition.x;
    const deltaY = e.clientY - lastMousePosition.y;
    
    setViewport(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY
    }));
    
    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsDraggingCanvas(e.type === 'keydown');
      }
      if (e.key === '0' && e.ctrlKey) {
        setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyPress);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[calc(100vh-120px)] overflow-hidden bg-gray-50 rounded-xl shadow-inner
        ${isDraggingCanvas ? 'cursor-grab' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.scale}px ${20 * viewport.scale}px`,
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px)`
        }}
      />

      <div 
        style={{
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          width: '100%',
          height: '100%'
        }}
      >
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {renderConnectors()}
        </svg>
        
        {Array.from(nodes.entries()).map(([nodeId, node]) => {
          const position = nodePositions.get(nodeId) || { x: 0, y: 0 };
          return (
            <TimelineNode
              key={nodeId}
              node={node}
              position={position}
              isActive={nodeId === currentState.currentNodeId}
              hasBeenExplored={currentState.exploredBranches.has(nodeId)}
              onClick={() => navigate(nodeId)}
              onJumpClick={() => jumpToTimeline(nodeId)}
              onDragStart={(e) => handleDragStart(nodeId, e)}
              onDragEnd={handleDragEnd}
              onDrag={handleDrag}
              onSystemPromptEdit={nodeId === 'root' ? handleSystemPromptEdit : undefined}
              totalNodes={nodes.size}
            />
          );
        })}
      </div>

      <div className="absolute bottom-24 left-4 flex gap-2 bg-white rounded-lg shadow p-2 z-10">
        <button 
          className="px-2 hover:bg-gray-100 rounded"
          onClick={() => setViewport(prev => ({ ...prev, scale: prev.scale * 1.2 }))}
        >
          +
        </button>
        <span className="px-2">{Math.round(viewport.scale * 100)}%</span>
        <button 
          className="px-2 hover:bg-gray-100 rounded"
          onClick={() => setViewport(prev => ({ ...prev, scale: prev.scale / 1.2 }))}
        >
          -
        </button>
      </div>
    </div>
  );
};