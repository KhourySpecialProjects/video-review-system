import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "react-router";
import { Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EligibleStudyUsersResponse, EligibleStudyUser } from "@shared/study";

/**
 * @description Multi-select combobox for enrolling caregivers in a study.
 * Uses shadcn Combobox with chips to show selected users and a searchable
 * dropdown to pick from eligible caregivers. Submits via the study-detail
 * resource route action.
 *
 * @param studyId - The study to add caregivers to.
 */
export function StudyCaregiverPicker({ studyId }: { studyId: string }) {
  const eligibleFetcher = useFetcher<EligibleStudyUsersResponse>();
  const actionFetcher = useFetcher();
  const [selectedUsers, setSelectedUsers] = useState<EligibleStudyUser[]>([]);

  useEffect(() => {
    eligibleFetcher.load(`/admin/study-detail?studyId=${studyId}`);
  }, [studyId]);

  const eligibleUsers = eligibleFetcher.data?.users ?? [];

  /** @description Submits selected users and clears the selection. */
  const handleAddUsers = useCallback(() => {
    if (selectedUsers.length === 0) return;

    const formData = new FormData();
    formData.set("intent", "addUsers");
    formData.set("studyId", studyId);
    selectedUsers.forEach((u) => formData.append("userIds", u.id));

    actionFetcher.submit(formData, {
      method: "post",
      action: "/admin/study-detail",
    });

    setSelectedUsers([]);
    eligibleFetcher.load(`/admin/study-detail?studyId=${studyId}`);
  }, [actionFetcher, eligibleFetcher, studyId, selectedUsers]);

  if (eligibleFetcher.state === "loading" && !eligibleFetcher.data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (eligibleUsers.length === 0 && selectedUsers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No eligible caregivers available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Select Caregivers</Label>
      <Combobox
        multiple
        value={selectedUsers}
        onValueChange={setSelectedUsers}
        itemToStringLabel={(user: EligibleStudyUser) => user.name}
        itemToStringValue={(user: EligibleStudyUser) => user.id}
        isItemEqualToValue={(a: EligibleStudyUser, b: EligibleStudyUser) =>
          a.id === b.id
        }
      >
        <ComboboxChips>
          {selectedUsers.map((user) => (
            <ComboboxChip key={user.id}>
              {user.name}
            </ComboboxChip>
          ))}
          <ComboboxChipsInput placeholder="Search caregivers..." />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {eligibleUsers.map((user) => (
              <ComboboxItem key={user.id} value={user}>
                <span>{user.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  {user.email}
                </span>
              </ComboboxItem>
            ))}
            <ComboboxEmpty>No caregivers found.</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Button
        size="sm"
        onClick={handleAddUsers}
        disabled={
          selectedUsers.length === 0 || actionFetcher.state !== "idle"
        }
      >
        <Check className="size-4" />
        Add {selectedUsers.length} Caregiver
        {selectedUsers.length !== 1 ? "s" : ""}
      </Button>
    </div>
  );
}
