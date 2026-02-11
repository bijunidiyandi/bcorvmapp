import React from 'react';
import { TextInput, Text, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FieldDefinition } from './types';

export default function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: any;
  onChange: (val: any) => void;
}) {
  switch (field.type) {
    case 'text':
      return (
        <>
          <Text>{field.label}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      );

    case 'dropdown':
      return (
        <>
          <Text>{field.label}</Text>
          <Picker selectedValue={value} onValueChange={onChange}>
            {field.options?.map((o) => (
              <Picker.Item key={o.value} label={o.label} value={o.value} />
            ))}
          </Picker>
        </>
      );

    case 'checkbox':
      return (
        <>
          <Text>{field.label}</Text>
          <Switch value={value === 1} onValueChange={(v) => onChange(v ? 1 : 0)} />
        </>
      );

    default:
      return null;
  }
}
