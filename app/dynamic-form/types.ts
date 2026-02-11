export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'checkbox'
  | 'geolocation';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;

  width?: 50 | 100; // for 2-column layout

  validation?: ValidationRule;

  options?: { label: string; value: any }[]; // dropdown

  dependsOn?: string; // Country → City
  loadOptions?: (parentValue: any) => Promise<any[]>;

  defaultValue?: any;
}
