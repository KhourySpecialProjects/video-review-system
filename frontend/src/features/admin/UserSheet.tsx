import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type UserRole =
    | "Caregiver"
    | "Clinical Reviewer"
    | "Site Coordinator"
    | "System Admin";

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    site: string;
}

export interface UserSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User;
}

interface FormErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    site?: string;
}

export function UserSheet({ open, onOpenChange, user }: UserSheetProps) {
    const isEdit = user !== undefined;

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<UserRole | "">("");
    const [site, setSite] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});

    // Sync form fields when the sheet opens or the user changes.
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName);
            setLastName(user.lastName);
            setEmail(user.email);
            setRole(user.role);
            setSite(user.site);
        } else {
            setFirstName("");
            setLastName("");
            setEmail("");
            setRole("");
            setSite("");
        }
        setErrors({});
    }, [user, open]);

    function validate(): boolean {
        const next: FormErrors = {};
        if (!firstName.trim()) next.firstName = "First name is required.";
        if (!lastName.trim()) next.lastName = "Last name is required.";
        if (!email.trim()) {
            next.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            next.email = "Enter a valid email address.";
        }
        if (!role) next.role = "Role is required.";
        if (role === "Site Coordinator" && !site.trim()) {
            next.site = "Site is required for Site Coordinators.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    // TODO: wire to backend API
    function handleSubmit() {
        if (!validate()) return;
        toast.success(isEdit ? "User updated successfully." : "User created successfully.");
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-6 py-4">
                    <SheetTitle className="text-base font-semibold">
                        {isEdit ? "Edit User" : "Create User"}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                    {/* First Name */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Jane"
                        />
                        {errors.firstName && (
                            <p className="text-xs text-red-500">{errors.firstName}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                        />
                        {errors.lastName && (
                            <p className="text-xs text-red-500">{errors.lastName}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane.doe@example.com"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500">{errors.email}</p>
                        )}
                    </div>

                    {/* Role */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Role</Label>
                        <Select
                            value={role}
                            onValueChange={(v) => {
                                setRole(v as UserRole);
                                if (v !== "Site Coordinator") setSite("");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Caregiver">Caregiver</SelectItem>
                                <SelectItem value="Clinical Reviewer">Clinical Reviewer</SelectItem>
                                <SelectItem value="Site Coordinator">Site Coordinator</SelectItem>
                                <SelectItem value="System Admin">System Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-xs text-red-500">{errors.role}</p>
                        )}
                    </div>

                    {/* Site — only visible for Site Coordinator */}
                    {role === "Site Coordinator" && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="site">Site</Label>
                            <Input
                                id="site"
                                value={site}
                                onChange={(e) => setSite(e.target.value)}
                                placeholder="Boston General"
                            />
                            {errors.site && (
                                <p className="text-xs text-red-500">{errors.site}</p>
                            )}
                        </div>
                    )}
                </div>

                <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {isEdit ? "Save Changes" : "Create User"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
