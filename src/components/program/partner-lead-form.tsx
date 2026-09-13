import type { InputHTMLAttributes } from 'react';
import { SubmitButton } from '@/components/program/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { painPointLabels, productInterestLabels } from '@/lib/partner-program/labels';
import {
  PAIN_POINTS,
  PRODUCT_INTERESTS,
  type PartnerLead,
} from '@/lib/partner-program/types';

type PartnerLeadFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  lead?: PartnerLead | null;
  submitLabel: string;
};

export function PartnerLeadForm({ action, lead, submitLabel }: PartnerLeadFormProps) {
  return (
    <form action={action} className="grid gap-4">
      {lead ? <input name="leadId" type="hidden" value={lead.id} /> : null}
      <Field defaultValue={lead?.restaurant_name} label="Restaurant name" name="restaurantName" required />
      <Field defaultValue={lead?.legal_business_name ?? ''} label="Legal / registered business name" name="legalBusinessName" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Field defaultValue={lead?.owner_name} label="Owner / manager" name="ownerName" required />
        <Field defaultValue={lead?.phone} label="Phone" name="phone" required />
      </div>
      <Field defaultValue={lead?.email ?? ''} label="Owner email" name="email" type="email" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Field defaultValue={lead?.city} label="City" name="city" required />
        <Field defaultValue={lead?.locality} label="Locality" name="locality" required />
      </div>
      <Field defaultValue={lead?.branch_address ?? ''} label="Primary branch address" name="branchAddress" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Field defaultValue={lead?.state ?? ''} label="State" name="state" />
        <Field defaultValue={lead?.country ?? 'India'} label="Country" name="country" />
        <Field defaultValue={lead?.postal_code ?? ''} label="Postal code" name="postalCode" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Field defaultValue={lead?.timezone ?? 'Asia/Kolkata'} label="Timezone" name="timezone" />
        <Field
          defaultValue={lead?.gst_registration_type ?? ''}
          label="GST / registration context"
          name="gstRegistrationType"
          placeholder="regular, composition, unregistered, not sure"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Field defaultValue={lead?.restaurant_type ?? ''} label="Restaurant type" name="restaurantType" />
        <Field defaultValue={lead?.outlet_count ?? 1} label="Number of outlets" min={1} name="outletCount" type="number" />
      </div>
      <div className="grid gap-4 rounded-2xl border p-4">
        <div>
          <div className="font-medium">Nom service history</div>
          <p className="text-sm text-muted-foreground">
            Tell us whether this restaurant is new to Nom or already uses Nom services.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="affiliateReportedPlatformLinkKind">What best describes this restaurant?</Label>
          <NativeSelect
            defaultValue={lead?.affiliate_reported_platform_link_kind ?? 'new_restaurant'}
            id="affiliateReportedPlatformLinkKind"
            name="affiliateReportedPlatformLinkKind"
          >
            <option value="new_restaurant">New to Nom</option>
            <option value="existing_franchise">Existing Nom franchise adding locations</option>
            <option value="existing_branch">Existing Nom restaurant adding a branch</option>
            <option value="existing_customer_addon">Existing Nom customer interested in more services</option>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="affiliateReportedExistingCustomerNotes">What do you know about their Nom account?</Label>
          <Textarea
            defaultValue={lead?.affiliate_reported_existing_customer_notes ?? ''}
            id="affiliateReportedExistingCustomerNotes"
            name="affiliateReportedExistingCustomerNotes"
            placeholder="Franchise or branch name, owner contact, services they use, or what they need..."
          />
        </div>
      </div>
      <Field
        defaultValue={lead?.current_system ?? ''}
        label="Current system"
        name="currentSystem"
        placeholder="Old POS, manual, not sure"
      />
      <MultiChoiceField
        legend="Products they may be interested in"
        name="productsInterested"
        options={PRODUCT_INTERESTS.map((value) => ({ label: productInterestLabels[value], value }))}
        selected={lead?.products_interested ?? []}
      />
      <MultiChoiceField
        legend="What challenges are they facing?"
        name="painPoints"
        options={PAIN_POINTS.map((value) => ({ label: painPointLabels[value], value }))}
        selected={lead?.pain_points ?? []}
      />
      <Field
        defaultValue={lead?.relationship_context}
        label="Relationship context"
        name="relationshipContext"
        placeholder="Owner is my contact, visited and interested..."
        required
      />
      <Field defaultValue={lead?.preferred_contact_time ?? ''} label="Preferred contact time" name="preferredContactTime" />
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea defaultValue={lead?.notes ?? ''} id="notes" name="notes" />
      </div>
      <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
        <input
          className="mt-0.5 size-4"
          defaultChecked={lead?.consent_to_contact ?? false}
          name="consentToContact"
          required
          type="checkbox"
        />
        <span>
          The restaurant agreed to be contacted or has a genuine reason to expect follow-up.
          <span aria-hidden="true" className="text-destructive"> *</span>
        </span>
      </label>
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Fake, duplicate, scraped, or unsupported leads may be rejected and can affect partner quality.
      </p>
      <SubmitButton pendingLabel="Saving lead…">{submitLabel}</SubmitButton>
    </form>
  );
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, required, ...inputProps } = props;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
      </Label>
      <Input id={name} name={name} required={required} {...inputProps} />
    </div>
  );
}

function MultiChoiceField({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: readonly { label: string; value: string }[];
  selected: readonly string[];
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border p-4">
      <legend className="px-1 font-medium">{legend}</legend>
      <p className="text-sm text-muted-foreground">Select all that apply.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm" key={option.value}>
            <input
              className="size-4 shrink-0 accent-plum"
              defaultChecked={selected.includes(option.value)}
              name={name}
              type="checkbox"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
