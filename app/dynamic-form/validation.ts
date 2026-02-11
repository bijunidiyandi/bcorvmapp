export function validate(schema: any[], values: any) {
  const errors: any = {};

  schema.forEach((field) => {
    const val = values[field.name];

    if (field.validation?.required && !val) {
      errors[field.name] = `${field.label} is required`;
    }

    if (
      field.validation?.minLength &&
      val?.length < field.validation.minLength
    ) {
      errors[field.name] = `${field.label} too short`;
    }
  });

  return errors;
}
