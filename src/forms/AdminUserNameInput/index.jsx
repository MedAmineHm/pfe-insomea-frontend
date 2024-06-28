import React from "react";
import { TextInput } from "@mantine/core";
import { Controller } from "react-hook-form";

const AdminUserNameInput = ({
  control,
  disabled = false,
  required = false,
  ...rest
}) => {
  const rules = required || disabled ? { required: "Required!" } : {};

  return (
    <Controller
      control={control}
      name="adminUsername"
      rules={rules}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => {
        return (
          <TextInput
            mt="md"
            size="sm"
            label="Admin Username"
            control={control}
            disabled={disabled}
            value={value ?? ""}
            error={error?.message}
            withAsterisk={required}
            ref={ref}
            onChange={onChange}
            {...rest}
          />
        );
      }}
    />
  );
};

export default AdminUserNameInput;
