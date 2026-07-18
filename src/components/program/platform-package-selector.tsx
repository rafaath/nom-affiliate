'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/partner-program/format';
import {
  buildRequestedPackageSnapshot,
  mergePlanAndRequestedFeatureCodes,
  type PackageCommissionRule,
} from '@/lib/partner-program/platform/package';
import type { PlatformCatalog } from '@/lib/partner-program/platform/types';

type Props = {
  catalog: PlatformCatalog;
  commissionRules: PackageCommissionRule[];
  partnerType: string;
  defaultBranchCount?: number;
};

export function PlatformPackageSelector({ catalog, commissionRules, partnerType, defaultBranchCount = 1 }: Props) {
  const firstPlan = catalog.plans[0] ?? null;
  const [selectedPlanId, setSelectedPlanId] = useState(firstPlan?.id ?? '');
  const [manualFeatureCodes, setManualFeatureCodes] = useState<string[]>([]);
  const [branchCount, setBranchCount] = useState(defaultBranchCount);
  const selectedPlan = catalog.plans.find((plan) => plan.id === selectedPlanId) ?? firstPlan;

  const selectedFeatureCodes = useMemo(() => {
    if (!selectedPlan) return [];
    return mergePlanAndRequestedFeatureCodes(selectedPlan, manualFeatureCodes);
  }, [manualFeatureCodes, selectedPlan]);

  const snapshot = useMemo(() => {
    if (!selectedPlan) return null;
    return buildRequestedPackageSnapshot({
      plan: selectedPlan,
      selectedFeatureCodes,
      requestedBranchCount: branchCount,
      features: catalog.features,
      commissionRules,
      partnerType,
    });
  }, [branchCount, catalog.features, commissionRules, partnerType, selectedFeatureCodes, selectedPlan]);

  if (!selectedPlan || catalog.plans.length === 0) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>RMS package unavailable</CardTitle>
          <CardDescription>No active RMS subscription plans are available. Admin must activate plans before partners can submit restaurant onboarding requests.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4">
      <div>
        <div className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Restaurant package</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick what the restaurant wants. Nom admins can approve this as-is or override it before RMS provisioning.
        </p>
      </div>

      <input type="hidden" name="requestedPlanId" value={selectedPlan.id} />
      <input type="hidden" name="requestedPackageSummary" value={snapshot?.summary ?? ''} />
      <input type="hidden" name="requestedMonthlyRevenueCents" value={snapshot?.monthly_revenue_cents ?? 0} />
      <input type="hidden" name="requestedCommissionPreviewCents" value={snapshot?.commission_preview_cents ?? 0} />
      {selectedFeatureCodes.map((featureCode) => (
        <input key={featureCode} type="hidden" name="requestedFeatureCodes" value={featureCode} />
      ))}

      <div className="grid gap-3 md:grid-cols-3">
        {catalog.plans.map((plan) => {
          const selected = plan.id === selectedPlan.id;
          return (
            <label
              key={plan.id}
              className={`cursor-pointer rounded-xl border bg-background p-4 transition hover:border-primary ${selected ? 'border-primary shadow-sm' : ''}`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={selected}
                onChange={() => {
                  setSelectedPlanId(plan.id);
                  setManualFeatureCodes([]);
                }}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">{plan.code}</div>
                </div>
                {selected ? <Badge>Selected</Badge> : null}
              </div>
              <div className="mt-3 text-2xl font-black">{formatCurrency(plan.price_cents, plan.currency_code)}</div>
              <div className="text-xs text-muted-foreground">per {plan.billing_period}</div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{plan.description || `${plan.feature_codes.length} included RMS capabilities`}</p>
            </label>
          );
        })}
      </div>

      <div className="grid gap-2 md:max-w-xs">
        <Label htmlFor="requestedBranchCount">Branches / outlets in this package</Label>
        <Input
          id="requestedBranchCount"
          name="requestedBranchCount"
          type="number"
          min={1}
          max={500}
          value={branchCount}
          onChange={(event) => setBranchCount(Number(event.target.value || 1))}
          required
        />
      </div>

      <div className="grid gap-3">
        <div className="font-medium">Requested modules and add-ons</div>
        <div className="grid gap-2 md:grid-cols-3">
          {catalog.features.map((feature) => {
            const includedInPlan = selectedPlan.feature_codes.includes(feature.code);
            const checked = selectedFeatureCodes.includes(feature.code);
            return (
              <label key={feature.code} className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={includedInPlan}
                  onCheckedChange={(value) => {
                    setManualFeatureCodes((current) => {
                      if (value) return [...new Set([...current, feature.code])];
                      return current.filter((code) => code !== feature.code);
                    });
                  }}
                />
                <span>
                  <span className="block font-medium">{feature.label}</span>
                  <span className="block text-muted-foreground">{includedInPlan ? 'Included in selected plan' : feature.description || feature.code}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Package summary</CardTitle>
          <CardDescription>{snapshot?.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Estimated monthly RMS value</div>
            <div className="text-xl font-black">{formatCurrency(snapshot?.monthly_revenue_cents ?? 0, snapshot?.currency_code)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Commission preview</div>
            <div className="text-xl font-black">{formatCurrency(snapshot?.commission_preview_cents ?? 0, snapshot?.currency_code)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Final payout rule</div>
            <div className="font-medium">{snapshot?.commission_preview.explanation}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
