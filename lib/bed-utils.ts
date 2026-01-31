import type { Bed, PatientData } from './types';

function hasContent(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasDxPlanContent(dx: PatientData['dx']): boolean {
  return Boolean(dx && (hasContent(dx.text) || dx.image));
}

export function hasBedPatientData(bed: Bed): boolean {
  const p = bed.patient;
  if (!p) return false;
  return (
    hasContent(p.name) ||
    p.age != null ||
    Boolean(p.gender) ||
    hasDxPlanContent(p.dx) ||
    hasDxPlanContent(p.plan) ||
    Boolean(p.inv?.length)
  );
}

export interface BedDataIndicators {
  name: boolean;
  dx: boolean;
  plan: boolean;
  inv: boolean;
}

export function getBedDataIndicators(bed: Bed): BedDataIndicators {
  const p = bed.patient;
  if (!p)
    return { name: false, dx: false, plan: false, inv: false };
  return {
    name: hasContent(p.name) || p.age != null || Boolean(p.gender),
    dx: hasDxPlanContent(p.dx),
    plan: hasDxPlanContent(p.plan),
    inv: Boolean(p.inv?.length),
  };
}
