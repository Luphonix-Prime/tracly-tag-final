import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetCurrentUser, useCreateCompany, useUpdateCompany, useListCompanies, getListCompaniesQueryKey } from "@workspace/api-client-react";
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
    .min(1, "GSTIN is required")
    .transform((val) => val?.trim().toUpperCase())
    .refine(
      (val) => /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]Z[A-Z0-9]?$/.test(val),
      "Invalid GSTIN format. Expected: 2-digit state code, 10-char PAN, 1-char registration code, 'Z', and optional check code (e.g., 27AAAAA0000A1Z5)."
    ),
  companyUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim().toLowerCase())
    .refine(
      (val) => !val || (val.startsWith("verify.") && val.split(".").filter(Boolean).length >= 3),
      "Custom domain must use 'verify' as the subdomain (e.g., verify.company.com)"
    ),
  pan: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim().toUpperCase())
    .refine(
      (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
      "Invalid Indian PAN format. Expected: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)."
    ),
  cin: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim().toUpperCase()),
  msmeRegistrationNo: z
    .string()
    .optional()
    .or(z.literal("")),
  fssaiLicenseNo: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^\d{14}$/.test(val),
      "Invalid FSSAI License Number format. Expected standard 14 digits."
    ),
  drugLicenseNo: z
    .string()
    .optional()
    .or(z.literal("")),
  iecCode: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^\d{10}$/.test(val),
      "Invalid IEC Code format. Expected standard 10 digits."
    ),
  companyPrefix: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^\d{7,11}$/.test(val),
      "Invalid GS1 Company Prefix format. Expected 7 to 11 digits."
    ),
});

import { useConfirmAlerts, requestMultipleConfirmations } from "@/hooks/useConfirmAlerts";

export default function NewCompany() {
  const { id: idStr } = useParams<{ id?: string }>();
  const id = idStr ? parseInt(idStr, 10) : undefined;
  const isEdit = id !== undefined;

  const { confirmCount } = useConfirmAlerts();
  const { data: user } = useGetCurrentUser();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const { data: companies = [] } = useListCompanies();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});

  const markSectionDirty = (sectionName: string) => {
    setDirtySections((prev) => ({ ...prev, [sectionName]: true }));
  };

  const markSectionClean = (sectionName: string) => {
    setDirtySections((prev) => ({ ...prev, [sectionName]: false }));
  };

  const hasAnyDirtySection = Object.values(dirtySections).some(Boolean);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEdit && hasAnyDirtySection) {
        e.preventDefault();
        e.returnValue = "You have unsaved edited changes! Please confirm or save your changes before leaving.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEdit, hasAnyDirtySection]);

  const confirmNavigation = (targetPath: string) => {
    if (isEdit && hasAnyDirtySection) {
      const confirmLeave = window.confirm(
        "You have unconfirmed changes in one or more sections! Are you sure you want to leave without saving?"
      );
      if (!confirmLeave) return;
    }
    setLocation(targetPath);
  };

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      email: "",
      address: "",
      gstin: "",
      companyUrl: "",
      pan: "",
      cin: "",
      msmeRegistrationNo: "",
      fssaiLicenseNo: "",
      drugLicenseNo: "",
      iecCode: "",
      companyPrefix: "",
    },
  });

  const company = companies.find(c => c.id === id);

  useEffect(() => {
    if (isEdit && company) {
      form.reset({
        name: company.name || "",
        email: company.email || "",
        address: company.address || "",
        gstin: company.gstin || "",
        companyUrl: company.companyUrl || "",
        pan: company.pan || "",
        cin: company.cin || "",
        msmeRegistrationNo: company.msmeRegistrationNo || "",
        fssaiLicenseNo: company.fssaiLicenseNo || "",
        drugLicenseNo: company.drugLicenseNo || "",
        iecCode: company.iecCode || "",
        companyPrefix: company.companyPrefix || "",
      });
      setDirtySections({});
    }
  }, [company, isEdit]);

  if (user?.role !== "master" && user?.role !== "super_master" && user?.role !== "admin") {
    return <div className="p-8 text-center text-destructive">Access denied. Master or Admin role required.</div>;
  }

  const handleSaveSection = async (sectionName: string) => {
    if (!isEdit || !id) return;
    const confirmed = await requestMultipleConfirmations(confirmCount, sectionName);
    if (!confirmed) return;

    const values = form.getValues();

    updateCompany.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          markSectionClean(sectionName);
          toast.success(`${sectionName} saved successfully`);
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || `Failed to update ${sectionName}`);
        },
      }
    );
  };

  const onSubmit = (values: z.infer<typeof companySchema>) => {
    if (isEdit) {
      updateCompany.mutate({ id, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          setDirtySections({});
          toast.success("Company updated successfully");
          setLocation("/companies");
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || "Failed to update company");
        }
      });
    } else {
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
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => confirmNavigation("/dashboard")}>Master Data</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => confirmNavigation("/companies")}>Companies</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">{isEdit ? "Edit Company" : "Add New Company"}</span>
      </nav>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">{isEdit ? "Edit Company" : "Add New Company"}</h2>
              <p className="text-[16px] text-slate-600 mt-1">{isEdit ? "Modify corporate settings and regulatory information using section save buttons." : "Initialize a new secure corporate node in the TracelyTag network."}</p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => confirmNavigation("/companies")}
                className="px-6 py-2.5 border border-slate-200 text-[#0F172A] font-semibold rounded-lg hover:bg-slate-50 transition-colors h-auto cursor-pointer"
              >
                {isEdit ? "Back to Companies" : "Discard"}
              </Button>
              {!isEdit && (
                <Button
                  type="submit"
                  disabled={createCompany.isPending}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all flex items-center gap-2 active:scale-95 h-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Save Company
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Primary Details */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Section 1: Basic Company Details */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Basic Company Details</h3>
                    {isEdit && dirtySections["Basic Company Details"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Basic Company Details")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Basic Details
                    </Button>
                  )}
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
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>alternate_email</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Contact Information</h3>
                    {isEdit && dirtySections["Contact Information"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Contact Information")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Contact Info
                    </Button>
                  )}
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

              {/* Section 3: Indian Corporate & Regulatory Information */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Indian Corporate & Regulatory Identifiers</h3>
                    {isEdit && dirtySections["Indian Corporate Identifiers"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Indian Corporate Identifiers")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Identifiers
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          GSTIN <span className="text-[#EF4444]">*</span>
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

                  <FormField
                    control={form.control}
                    name="pan"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          PAN (PERMANENT ACCOUNT NUMBER)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABCDE1234F" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all uppercase font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cin"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          CIN (CORPORATE IDENTIFICATION NUMBER)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="L21010MH1999PLC123456" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all uppercase font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="msmeRegistrationNo"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          MSME UDYAM REGISTRATION NUMBER
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="UDYAM-GJ-01-1234567" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fssaiLicenseNo"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          FSSAI LICENSE NUMBER (14 DIGITS)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="12345678901234" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drugLicenseNo"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          DRUG LICENSE NUMBER
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="G-28/1234-A" 
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
                    name="iecCode"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                          IEC (IMPORT EXPORT CODE - 10 DIGITS)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0123456789" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] text-[#EF4444]" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Section 4: GS1 Company Registry */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">GS1 Company Registry</h3>
                    {isEdit && dirtySections["GS1 Company Registry"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("GS1 Company Registry")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save GS1 Registry
                    </Button>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="companyPrefix"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                        GS1 COMPANY PREFIX (GCP)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 8901023 (7 to 11 digits numeric)" 
                          className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Enter your official GS1 Company Prefix. This will enable automatic EAN-13/GTIN-14 parsing and GS1 barcode standards compliance throughout your profile products.
                      </p>
                      <FormMessage className="text-[11px] text-[#EF4444]" />
                    </FormItem>
                  )}
                />
              </section>

              {/* Section 5: Custom Domain / Portal Setup */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>dns</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Custom Domain / Portal URL</h3>
                    {isEdit && dirtySections["Custom Domain Setup"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Custom Domain Setup")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Portal URL
                    </Button>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="companyUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 flex items-center gap-1 uppercase">
                        PORTAL URL / CUSTOM DOMAIN
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="verify.company.com" 
                          className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
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
