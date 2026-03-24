// zod catches request validation errors and formats them in a consistent way
import { z } from "zod";

export const createVideoSchema = z.object({
  patientId: z.uuid("Patient ID must be a valid UUID"),
  // ...
});