import * as React from "react"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "./input"
import { cn } from "@/lib/utils"

/**
 * @description Password input with an eye button that toggles visibility
 * between `type="password"` and `type="text"`. Wraps the standard Input
 * so it inherits identical styling, and forwards all remaining props
 * (name, id, required, autoComplete, className, aria-*) so it drops in
 * anywhere a plain Input would.
 *
 * @param className - Additional classes merged onto the input element
 * @param props - Remaining native input props (type is ignored — this
 *   component controls it)
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
