'use client';

import { useState } from 'react';
import { RiAddLine, RiCloseLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ContainerConfig } from '@/server/db/schema';

export interface ContainerSettingsData {
  containerEnabled: boolean;
  containerConfig: ContainerConfig;
  maxConcurrency: number;
  autoStart: boolean;
}

interface ContainerSettingsProps {
  initialData: ContainerSettingsData;
  onChange: (data: ContainerSettingsData) => void;
}

function initialList(items: string[] | undefined): string[] {
  return items && items.length > 0 ? items : [];
}

function initialEnvVars(
  envVars: Record<string, string> | undefined,
): Array<{ key: string; value: string }> {
  if (!envVars || Object.keys(envVars).length === 0) return [];
  return Object.entries(envVars).map(([key, value]) => ({ key, value }));
}

export function ContainerSettings({ initialData, onChange }: ContainerSettingsProps) {
  const [containerEnabled, setContainerEnabled] = useState(initialData.containerEnabled);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(
    initialList(initialData.containerConfig?.allowedDomains),
  );
  const [extraPackages, setExtraPackages] = useState<string[]>(
    initialList(initialData.containerConfig?.extraPackages),
  );
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    initialEnvVars(initialData.containerConfig?.envVars),
  );
  const [idleTimeout, setIdleTimeout] = useState<number>(
    initialData.containerConfig?.idleTimeout ?? 30,
  );
  const [maxConcurrency, setMaxConcurrency] = useState(initialData.maxConcurrency);
  const [autoStart, setAutoStart] = useState(initialData.autoStart);

  function emitChange(overrides: Partial<{
    containerEnabled: boolean;
    allowedDomains: string[];
    extraPackages: string[];
    envVars: Array<{ key: string; value: string }>;
    idleTimeout: number;
    maxConcurrency: number;
    autoStart: boolean;
  }>) {
    const enabled = overrides.containerEnabled ?? containerEnabled;
    const domains = overrides.allowedDomains ?? allowedDomains;
    const packages = overrides.extraPackages ?? extraPackages;
    const vars = overrides.envVars ?? envVars;
    const timeout = overrides.idleTimeout ?? idleTimeout;
    const concurrency = overrides.maxConcurrency ?? maxConcurrency;
    const start = overrides.autoStart ?? autoStart;

    const envRecord: Record<string, string> = {};
    for (const { key, value } of vars) {
      if (key.trim()) envRecord[key.trim()] = value;
    }

    onChange({
      containerEnabled: enabled,
      containerConfig: {
        allowedDomains: domains.filter((d) => d.trim() !== ''),
        extraPackages: packages.filter((p) => p.trim() !== ''),
        envVars: Object.keys(envRecord).length > 0 ? envRecord : undefined,
        idleTimeout: timeout,
      },
      maxConcurrency: concurrency,
      autoStart: start,
    });
  }

  // List editor helpers
  function addDomain() {
    const next = [...allowedDomains, ''];
    setAllowedDomains(next);
    emitChange({ allowedDomains: next });
  }
  function removeDomain(i: number) {
    const next = allowedDomains.filter((_, idx) => idx !== i);
    setAllowedDomains(next);
    emitChange({ allowedDomains: next });
  }
  function updateDomain(i: number, value: string) {
    const next = [...allowedDomains];
    next[i] = value;
    setAllowedDomains(next);
    emitChange({ allowedDomains: next });
  }

  function addPackage() {
    const next = [...extraPackages, ''];
    setExtraPackages(next);
    emitChange({ extraPackages: next });
  }
  function removePackage(i: number) {
    const next = extraPackages.filter((_, idx) => idx !== i);
    setExtraPackages(next);
    emitChange({ extraPackages: next });
  }
  function updatePackage(i: number, value: string) {
    const next = [...extraPackages];
    next[i] = value;
    setExtraPackages(next);
    emitChange({ extraPackages: next });
  }

  function addEnvVar() {
    const next = [...envVars, { key: '', value: '' }];
    setEnvVars(next);
    emitChange({ envVars: next });
  }
  function removeEnvVar(i: number) {
    const next = envVars.filter((_, idx) => idx !== i);
    setEnvVars(next);
    emitChange({ envVars: next });
  }
  function updateEnvVar(i: number, field: 'key' | 'value', val: string) {
    const next = [...envVars];
    next[i] = { ...next[i], [field]: val };
    setEnvVars(next);
    emitChange({ envVars: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="container-enabled">Enable container</Label>
        <Switch
          id="container-enabled"
          checked={containerEnabled}
          onCheckedChange={(checked) => {
            setContainerEnabled(checked);
            emitChange({ containerEnabled: checked });
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="container-auto-start">Auto start</Label>
        <Switch
          id="container-auto-start"
          checked={autoStart}
          onCheckedChange={(checked) => {
            setAutoStart(checked);
            emitChange({ autoStart: checked });
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="container-max-concurrency">Max concurrency</Label>
        <Input
          id="container-max-concurrency"
          type="number"
          min={1}
          value={maxConcurrency}
          onChange={(e) => {
            const val = Math.max(1, parseInt(e.target.value) || 1);
            setMaxConcurrency(val);
            emitChange({ maxConcurrency: val });
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="container-idle-timeout">Idle timeout (minutes)</Label>
        <Input
          id="container-idle-timeout"
          type="number"
          min={1}
          value={idleTimeout}
          onChange={(e) => {
            const val = Math.max(1, parseInt(e.target.value) || 1);
            setIdleTimeout(val);
            emitChange({ idleTimeout: val });
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Allowed domains</Label>
        {allowedDomains.map((domain, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="flex-1"
              value={domain}
              onChange={(e) => updateDomain(i, e.target.value)}
              placeholder="example.com"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove domain ${i + 1}`}
              onClick={() => removeDomain(i)}
            >
              <RiCloseLine />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={addDomain}>
          <RiAddLine data-icon="inline-start" />
          Add domain
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Extra packages</Label>
        {extraPackages.map((pkg, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="flex-1"
              value={pkg}
              onChange={(e) => updatePackage(i, e.target.value)}
              placeholder="package-name"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove package ${i + 1}`}
              onClick={() => removePackage(i)}
            >
              <RiCloseLine />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={addPackage}>
          <RiAddLine data-icon="inline-start" />
          Add package
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Environment variables</Label>
        {envVars.map((env, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="flex-1 font-mono"
              value={env.key}
              onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
              placeholder="KEY"
            />
            <Input
              className="flex-1"
              value={env.value}
              onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
              placeholder="value"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove variable ${i + 1}`}
              onClick={() => removeEnvVar(i)}
            >
              <RiCloseLine />
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={addEnvVar}>
          <RiAddLine data-icon="inline-start" />
          Add variable
        </Button>
      </div>
    </div>
  );
}
