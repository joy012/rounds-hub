/** JSON primitive values returned by JSON.parse. */
export type JsonPrimitive = string | number | boolean | null;

/** Recursive JSON value (object, array, or primitive). Used for type-safe parsing. */
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface InvRow {
  id: string;
  date?: string;
  dateImage?: string;
  investigation?: string;
  investigationImage?: string;
  findings?: string;
  findingsImage?: string;
}

export interface DxPlanContent {
  text?: string;
  image?: string; // base64 handwriting
}

export interface PatientData {
  name?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  dx?: DxPlanContent;
  plan?: DxPlanContent;
  inv?: InvRow[];
}

export interface Bed {
  id: string;
  number: number;
  patient?: PatientData;
}

export interface Ward {
  id: string;
  title: string;
  wardNumber?: string;
  beds: Bed[];
}
