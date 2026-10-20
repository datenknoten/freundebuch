/** Professional history entry in API responses */
export interface ProfessionalHistory {
  id: string;
  jobTitle?: string;
  organization?: string;
  department?: string;
  notes?: string;
  fromMonth: number;
  fromYear: number;
  toMonth?: number | null;
  toYear?: number | null;
  isPrimary: boolean;
  createdAt: string;
}
