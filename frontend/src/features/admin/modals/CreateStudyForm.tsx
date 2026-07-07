import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import type {
  SiteOption,
  SiteOptionsResponse,
  SiteCaregiversResponse,
  EligibleStudyUser,
} from "../admin.types";

/**
 * @description Form body for the create-study dialog. Handles multi-site
 * linking and optional caregiver enrollment. Submits via fetcher.Form to
 * the /admin/create-study resource route where Zod validation runs. The
 * Combobox components produce form-submittable values via hidden inputs
 * when given a `name` prop. Mounted inside DialogContent, so all local
 * selection state resets naturally when the dialog closes and the popup
 * unmounts.
 *
 * @param onOpenChange - Handler for dialog open state changes.
 */
export function CreateStudyForm({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const fetcher = useFetcher<{
    ok: boolean;
    fieldErrors?: Record<string, string[]>;
  }>();
  const sitesFetcher = useFetcher<SiteOptionsResponse>();
  const caregiversFetcher = useFetcher<SiteCaregiversResponse>();

  const [selectedSites, setSelectedSites] = useState<SiteOption[]>([]);
  const [addAllCaregivers, setAddAllCaregivers] = useState(false);

  const siteOptions = sitesFetcher.data?.sites ?? [];
  const availableCaregivers = caregiversFetcher.data?.users ?? [];
  const fieldErrors = fetcher.data?.fieldErrors;

  /** @description Loads site options on mount (the popup mounts on open). */
  useEffect(() => {
    sitesFetcher.load("/sites/options");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** @description Comma-separated selected site IDs for the caregiver fetch. */
  const selectedSiteIds = selectedSites.map((s) => s.id).join(",");

  /** @description Loads caregivers whenever the selected site set changes. */
  useEffect(() => {
    if (selectedSiteIds) {
      caregiversFetcher.load(
        `/studies/caregivers-for-sites?siteIds=${selectedSiteIds}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteIds]);

  /** @description Close dialog on successful submission. */
  const prevState = useRef(fetcher.state);
  useEffect(() => {
    if (
      prevState.current !== "idle" &&
      fetcher.state === "idle" &&
      fetcher.data?.ok
    ) {
      onOpenChange(false);
    }
    prevState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, onOpenChange]);

  return (
    <fetcher.Form method="post" action="/admin/create-study" className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="study-name">Study Name</Label>
        <Input id="study-name" name="name" placeholder="Study name..." />
        {fieldErrors?.name && <FieldError>{fieldErrors.name[0]}</FieldError>}
      </div>

      <div className="space-y-1.5">
        <Label>Sites</Label>
        <Combobox
          multiple
          name="siteIds"
          value={selectedSites}
          onValueChange={setSelectedSites}
          itemToStringLabel={(site: SiteOption) => site.name}
          itemToStringValue={(site: SiteOption) => site.id}
          isItemEqualToValue={(a: SiteOption, b: SiteOption) => a.id === b.id}
        >
          <ComboboxChips>
            {selectedSites.map((site) => (
              <ComboboxChip key={site.id}>{site.name}</ComboboxChip>
            ))}
            <ComboboxChipsInput placeholder="Search sites..." />
          </ComboboxChips>
          <ComboboxContent>
            <ComboboxList>
              {siteOptions.map((site) => (
                <ComboboxItem key={site.id} value={site}>
                  {site.name}
                </ComboboxItem>
              ))}
              <ComboboxEmpty>No sites found.</ComboboxEmpty>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {fieldErrors?.siteIds && (
          <FieldError>{fieldErrors.siteIds[0]}</FieldError>
        )}
      </div>

      {selectedSites.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id="addAllCaregivers"
              name="addAllCaregivers"
              value="true"
              checked={addAllCaregivers}
              onCheckedChange={(checked) =>
                setAddAllCaregivers(checked === true)
              }
            />
            <Label htmlFor="addAllCaregivers" className="text-sm">
              Add all caregivers from selected sites
            </Label>
          </div>

          {!addAllCaregivers && availableCaregivers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Select Caregivers</Label>
              <Combobox
                multiple
                name="caregiverUserIds"
                itemToStringLabel={(u: EligibleStudyUser) => u.name}
                itemToStringValue={(u: EligibleStudyUser) => u.id}
                isItemEqualToValue={(
                  a: EligibleStudyUser,
                  b: EligibleStudyUser,
                ) => a.id === b.id}
              >
                <ComboboxChips>
                  <ComboboxChipsInput placeholder="Search caregivers..." />
                </ComboboxChips>
                <ComboboxContent>
                  <ComboboxList>
                    {availableCaregivers.map((user) => (
                      <ComboboxItem key={user.id} value={user}>
                        <span>{user.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </ComboboxItem>
                    ))}
                    <ComboboxEmpty>No caregivers found.</ComboboxEmpty>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}
        </>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={fetcher.state !== "idle"}>
          Create Study
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
}
