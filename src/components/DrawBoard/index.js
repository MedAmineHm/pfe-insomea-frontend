import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  useEdgesState,
  useNodesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  useReactFlow,
} from "reactflow";
import { find, findLastIndex, insert, propEq } from "ramda";
import debounce from "lodash.debounce";

import "reactflow/dist/style.css";
import ResourceGroupNode from "./NodeTypes/ResourceGroupNode";
import LocationNode from "./NodeTypes/LocationNode";
import VnetNode from "./NodeTypes/VnetNode";
import SubnetNode from "./NodeTypes/SubnetNode";
import VmNode from "./NodeTypes/VmNode";
import DiscNode from "./NodeTypes/DiscNode";
import NsgNode from "./NodeTypes/NsgNode";
import PublicIpNode from "./NodeTypes/PublicIpNode";

const nodeTypes = {
  ResourceGroupNode,
  LocationNode,
  VnetNode,
  SubnetNode,
  VmNode,
  DiscNode,
  NsgNode,
  PublicIpNode,
};

const initialNodes = [];

const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

let id = 0;
const getId = (serviceId = "dndnode") => `${serviceId}_${id++}`;

const DrawBoard = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const { getIntersectingNodes } = useReactFlow();
  const [lastDropedNode, setLastDropedNode] = useState(false);

  // ======================== Edge Connect ==========================================
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // =========================== Node Drag Over ====================================
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // ============================ Node Drop ========================================
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const serviceId = event.dataTransfer.getData("serviceId");
      const label = event.dataTransfer.getData("label");
      const width = event.dataTransfer.getData("width");
      const height = event.dataTransfer.getData("height");
      const backgroundColor = event.dataTransfer.getData("backgroundColor");
      const serviceType = event.dataTransfer.getData("serviceType");
      const zIndex = event.dataTransfer.getData("zIndex");

      if (typeof type === "undefined" || !type) {
        return;
      }
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(serviceId),
        type,
        position,
        label,
        serviceType,
        zIndex,
        data: { label: `${label}` },
        style: {
          backgroundColor: `${backgroundColor}20`,
          border: `1px ${serviceType === "group" ? "dotted" : "solid"} black`,
          fontSize: 12,
          width: parseInt(width),
          height: parseInt(height),
        },
      };

      setNodes((nds) => {
        if (serviceType === "node") {
          return nds.concat(newNode);
        } else if (serviceType === "group") {
          const lastGroupIndex = findLastIndex(propEq("group", "serviceType"))(
            nds
          );
          const index = lastGroupIndex < 0 ? 0 : lastGroupIndex + 1;
          return insert(index, newNode, nds);
        }
      });

      setLastDropedNode(newNode);
    },
    [reactFlowInstance, setLastDropedNode]
  );

  // =================================== Node Delete =========================================
  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges(
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, edges);
          const outgoers = getOutgoers(node, nodes, edges);
          const connectedEdges = getConnectedEdges([node], edges);

          const remainingEdges = acc.filter(
            (edge) => !connectedEdges.includes(edge)
          );

          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            }))
          );

          return [...remainingEdges, ...createdEdges];
        }, edges)
      );
    },
    [nodes, edges]
  );

  // ====================================== Node Drag ========================================
  const updateNodeParent = (node, parentIntersection) => {
    if (parentIntersection) {
      setNodes((nodes) => {
        return nodes.map((n) => {
          if (n.id === node.id && n?.parentId !== parentIntersection) {
            return {
              ...n,
              parentId: parentIntersection,
              position: { x: 20, y: 30 },
            };
          }
          return n;
        });
      });
    } else {
      setNodes((nodes) => {
        return nodes.map((n) => {
          if (n.id === node.id) {
            delete n.parentId;
            n.position = n.positionAbsolute;
          }
          return n;
        });
      });
    }
  };

  const onNodeDragStop = useCallback(
    debounce((event, node) => {
      event.preventDefault();
      const intersections = getIntersectingNodes(node).map((n) => n.id);

      switch (node.type) {
        case "LocationNode":
          // console.log("location do nothing");
          break;
        case "ResourceGroupNode":
          // find a locationNode
          const parentLocationIntersection = find(
            (inter) => inter.startsWith("location"),
            intersections
          );
          updateNodeParent(node, parentLocationIntersection);
          break;
        case "VnetNode":
          // find a ResourceGroupNode
          const parentResourceIntersection = find(
            (inter) => inter.startsWith("ressourcegroup"),
            intersections
          );
          updateNodeParent(node, parentResourceIntersection);
          break;
        case "SubnetNode":
          // find a VnetNode
          const parentVnetIntersection = find(
            (inter) => inter.startsWith("vnet"),
            intersections
          );
          updateNodeParent(node, parentVnetIntersection);
          break;
        case "PublicIpNode":
          // find a ResourceGroupNode
          const parentResourceForIpIntersection = find(
            (inter) => inter.startsWith("ressourcegroup"),
            intersections
          );
          updateNodeParent(node, parentResourceForIpIntersection);
          break;
        case "NsgNode":
        case "VmNode":
        case "DiscNode":
          // find a ResourceGroupNode
          const parentIntersection = find(
            (inter) => inter.startsWith("subnet"),
            intersections
          );
          updateNodeParent(node, parentIntersection);
          break;
      }

      /*
      const intersection = intersections[intersections?.length - 1];

      if (intersection) {
        // ========= intersections ===================
        if (node.serviceType === "node") {
          setNodes((nodes) => {
            return nodes.map((n) => {
              if (n.id === node.id && n?.parentId !== intersection) {
                return {
                  ...n,
                  parentId: intersection,
                  position: { x: 50, y: 50 },
                };
              }
              return n;
            });
          });
        }

        if (node.serviceType === "group") {
          setNodes((nodes) => {
            return nodes.map((n) => {
              if (n.id === node.id && n?.parentId !== intersection) {
                return {
                  ...n,
                  parentId: intersection,
                  position: { x: 50, y: 50 },
                };
              }
              return n;
            });
          });
        }
      } else {
        // ======== no intersections ==========
        if (node.serviceType === "node") {
          setNodes((nodes) => {
            return nodes.map((n) => {
              if (n.id === node.id) {
                delete n.parentId;
                n.position = n.positionAbsolute;
              }
              return n;
            });
          });
        }
      }

      */
    }, 300),
    [reactFlowInstance]
  );

  // useEffect(() => {
  //   if (lastDropedNode) {
  //     const intersections = getIntersectingNodes(lastDropedNode).map(
  //       (n) => n.id
  //     );
  //     console.log("intersections: ", intersections);
  //     setLastDropedNode();
  //   }
  // }, [lastDropedNode]);

  console.log({ nodes });

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: "100%",
        height: "calc(100vh - 100px)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={setReactFlowInstance}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default DrawBoard;
