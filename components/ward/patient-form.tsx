import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import type { PatientData } from '@/lib/types';
import { Hash, User, VenusAndMars } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';

const GENDER_OPTIONS: { value: 'Male' | 'Female' | 'Other'; label: string }[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export interface PatientFormProps {
  patient: PatientData | undefined;
  onChange: (patient: PatientData) => void;
}

export function PatientForm({ patient, onChange }: PatientFormProps) {
  const name = patient?.name ?? '';
  const age = patient?.age ?? undefined;
  const gender = patient?.gender ?? undefined;

  const update = useCallback(
    (updates: Partial<PatientData>) => {
      onChange({ ...patient, ...updates } as PatientData);
    },
    [onChange, patient]
  );

  const ageStr = age !== undefined && age !== null ? String(age) : '';

  const genderOption: Option = useMemo(() => {
    const v = gender ?? 'none';
    const label = v === 'none' ? 'Select gender' : GENDER_OPTIONS.find((o) => o.value === v)?.label ?? v;
    return { value: v, label };
  }, [gender]);

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Label>
          <View className="flex-row items-center gap-2">
            <Icon as={User} size={14} className="text-primary" />
            <Text variant="small" className="text-foreground">Name</Text>
          </View>
        </Label>
        <Input
          placeholder="Patient name"
          value={name}
          onChangeText={(text) => update({ name: text || undefined })}
          className="rounded-lg border-border dark:border-border"
        />
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <Label>
            <View className="flex-row items-center gap-2">
              <Icon as={Hash} size={14} className="text-primary" />
              <Text variant="small" className="text-foreground">Age</Text>
            </View>
          </Label>
          <Input
            placeholder="Age"
            keyboardType="number-pad"
            value={ageStr}
            onChangeText={(text) => {
              const n = text ? parseInt(text, 10) : undefined;
              const valid =
                n !== undefined &&
                Number.isFinite(n) &&
                n >= 1 &&
                n <= 150;
              update({ age: valid ? n : undefined });
            }}
            className="rounded-lg border-border dark:border-border"
          />
        </View>
        <View className="flex-1 gap-2">
          <Label>
            <View className="flex-row items-center gap-2">
              <Icon as={VenusAndMars} size={14} className="text-primary" />
              <Text variant="small" className="text-foreground">Gender</Text>
            </View>
          </Label>
          <Select
            value={genderOption}
            onValueChange={(opt) =>
              update({
                gender: opt?.value === 'none' ? undefined : (opt?.value as PatientData['gender']),
              })
            }
          >
            <SelectTrigger className="w-full rounded-lg border-border dark:border-border">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" label="Select gender" />
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>
    </View>
  );
}
