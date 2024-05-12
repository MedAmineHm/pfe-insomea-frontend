import React, { memo, useMemo } from "react";
import { Handle, Position, useNodes } from "reactflow";
import { Button, Image } from "@mantine/core";
import { find } from "ramda";

const vmImg =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTefgWAwpvk2wdqXFWTY8mnSa59o6lWg3xwWgPeEXh4bg&s";

const VmNode = ({ data, selected = false, id }) => {
  const { actions } = data;
  const nodes = useNodes();
  const node = useMemo(() => find((n) => n.id === id, nodes), [nodes, id]);

  return (
    <>
      <div
        style={{
          padding: 10,
          height: 228,
          backgroundColor: selected ? "#4a9e65" : "#d1d1d1",
        }}
      >
        <Image src={vmImg} width={100} h={80} fit="contain" />
        <p
          style={{
            textAlign: "center",
            color: selected ? "#fff" : "#000",
            marginTop: 10,
            marginBottom: "10px",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: 16,
          }}
        >
          {data.values.name}
        </p>

        <p style={{ opacity: 0.5, marginTop: -12, fontStyle: "italic" }}>
          <span style={{ textDecoration: "underline" }}>parent</span>: test
        </p>

        <Button
          variant="filled"
          color="violet"
          size="xs"
          fullWidth
          style={{ marginTop: "-100px!important" }}
          onClick={() => actions.onConfigNode(node)}
        >
          Config
        </Button>
        <Button
          variant="filled"
          color="pink"
          size="xs"
          fullWidth
          style={{ marginTop: 5 }}
          onClick={() => actions.onDeleteNode(node)}
        >
          Delete
        </Button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={true}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="in"
        isConnectable={true}
      />
    </>
  );
};

export default memo(VmNode);