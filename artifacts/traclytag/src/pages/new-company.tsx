import { useLocation } from "wouter";
import { useGetCurrentUser, useCreateCompany, getListCompaniesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const companySchema = z.object({
  name: z.string().min(1, "Company Name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Physical Address is required"),
  gstin: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim().toUpperCase())
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]Z[A-Z0-9]?$/.test(val),
      "Invalid GSTIN format. Expected: 2-digit state code, 10-char PAN, 1-char registration code, 'Z', and optional check code (e.g., 27AAAAA0000A1Z5)."
    ),
});

export default function NewCompany() {
  const { data: user } = useGetCurrentUser();
  const createCompany = useCreateCompany();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", email: "", address: "", gstin: "" },
  });

  if (user?.role !== "master") {
    return <div className="p-8 text-center text-destructive">Access denied. Master role required.</div>;
  }

  const onSubmit = (values: z.infer<typeof companySchema>) => {
    createCompany.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        toast.success("Company created successfully");
        setLocation("/companies");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to create company");
      }
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => setLocation("/dashboard")}>Master Data</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => setLocation("/companies")}>Companies</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">Add New Company</span>
      </nav>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">Add New Company</h2>
              <p className="text-[16px] text-slate-600 mt-1">Initialize a new secure corporate node in the TracelyTag network.</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/companies")}
                className="px-6 py-2.5 border border-slate-200 text-[#0F172A] font-semibold rounded-lg hover:bg-slate-50 transition-colors h-auto cursor-pointer"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={createCompany.isPending}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all flex items-center gap-2 active:scale-95 h-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                Save Company
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Primary Details */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Section 1: Basic Company Details */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Basic Company Details</h3>
                </div>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          COMPANY NAME <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Apex Logistics International" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          PHYSICAL ADDRESS <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <FormControl>
                          <textarea 
                            placeholder="Full corporate office or primary warehouse location..." 
                            rows={3}
                            className="flex w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-[#2563EB] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none text-slate-900 transition-all"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Section 2: Contact Information */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>alternate_email</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Contact Information</h3>
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                        EMAIL ADDRESS <span className="text-[#EF4444]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="compliance@company.com" 
                          className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[11px] text-[#EF4444]" />
                    </FormItem>
                  )}
                />
              </section>

              {/* Section 3: Regulatory Information */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Regulatory Information</h3>
                </div>
                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                        GSTIN (OPTIONAL)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="27AAAAA0000A1Z5" 
                          className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all uppercase font-mono"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[11px] text-[#EF4444]" />
                    </FormItem>
                  )}
                />
              </section>
            </div>

            {/* Right Column: Security Accent */}
            <div className="col-span-12 lg:col-span-4">
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Forensic Reliability</h3>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The data provided will be cryptographically hashed and recorded on the enterprise audit trail for permanent compliance tracking. 
                    Ensure all identifiers match official government records for seamless verification.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
