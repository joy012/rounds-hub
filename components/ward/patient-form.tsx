import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import type { PatientData } from '@/lib/types';
import { Hash, User } from 'lucide-react-native';
import { useCallback } from 'react';
import { View } from 'react-native';

export interface PatientFormProps {
  patient: PatientData | undefined;
  onChange: (patient: PatientData) => void;
}

export function PatientForm({ patient, onChange }: PatientFormProps) {
  const name = patient?.name ?? '';
  const age = patient?.age ?? undefined;

  const update = useCallback(
    (updates: Partial<PatientData>) => {
      onChange({ ...patient, ...updates } as PatientData);
    },
    [onChange, patient]
  );

  const ageStr = age !== undefined && age !== null ? String(age) : '';

  return (
    <View className="flex-row gap-3">
      <View style={{ flex: 0.7 }} className="min-w-0 gap-2">
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
      <View style={{ flex: 0.3 }} className="min-w-0 gap-2">
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
    </View>
  );
}
