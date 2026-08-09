import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  useCreateLocation,
  getListLocationsQueryKey,
  useGetMyCompany,
  useListLocations,
  useGetCurrentUser,
  useListCompanies,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const locationSchema = z.object({
  locationType: z.string().min(1, "Type is required"),
  uniqueName: z.string().min(1, "Unique name is required"),
  locationName: z.string().min(1, "Location name is required"),
  contactNo: z.string().min(1, "Contact number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  gln: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^\d{13}$/.test(val),
      "Invalid GLN format. Expected standard 13 digits."
    ),
});

import { useConfirmAlerts, requestMultipleConfirmations } from "@/hooks/useConfirmAlerts";

type LocationForm = z.infer<typeof locationSchema>;

export default function NewLocation() {
  const { id: idStr } = useParams<{ id?: string }>();
  const id = idStr ? parseInt(idStr, 10) : undefined;
  const isEdit = id !== undefined;

  const { confirmCount } = useConfirmAlerts();
  const createLocation = useCreateLocation();
  const { data: currentUser } = useGetCurrentUser();
  const isMaster = currentUser?.role === "master" || currentUser?.role === "super_master";
  const { data: companies = [] } = useListCompanies({ query: { enabled: isMaster } } as any);
  const { data: myCompany } = useGetMyCompany();
  const { data: locations = [] } = useListLocations();
  const loc = locations.find(l => l.id === id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Local/UI Mock States for compliance / address mapping
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("none");
  const [contactPerson, setContactPerson] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [country, setCountry] = useState("India");
  const [zipCode, setZipCode] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

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

  const form = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      locationType: "Warehouse",
      uniqueName: "",
      locationName: "",
      contactNo: "",
      address: "",
      city: "",
      state: "",
      gln: "",
    },
  });

  useEffect(() => {
    if (isEdit && loc) {
      form.reset({
        locationType: loc.locationType || "Warehouse",
        uniqueName: loc.uniqueName || "",
        locationName: loc.locationName || "",
        contactNo: loc.contactNo || "",
        address: loc.address || "",
        city: loc.city || "",
        state: loc.state || "",
        gln: loc.gln || "",
      });
      if (loc.companyId) {
        setSelectedCompanyId(String(loc.companyId));
      } else {
        setSelectedCompanyId("none");
      }
      setDirtySections({});
    }
  }, [loc, isEdit]);

  const getPayload = () => {
    const values = form.getValues();
    return {
      ...values,
      companyId: isMaster
        ? selectedCompanyId && selectedCompanyId !== "none"
          ? Number(selectedCompanyId)
          : null
        : undefined,
    };
  };

  const handleSaveSection = async (sectionName: string) => {
    if (!isEdit || !id) return;
    const confirmed = await requestMultipleConfirmations(confirmCount, sectionName);
    if (!confirmed) return;

    const payload = getPayload();

    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to update ${sectionName}`);
      }
      queryClient.invalidateQueries({
        queryKey: getListLocationsQueryKey(),
      });
      markSectionClean(sectionName);
      toast.success(`${sectionName} saved successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to update ${sectionName}`);
    }
  };

  const onSubmit = (values: LocationForm) => {
    const payload = getPayload();

    if (isEdit) {
      fetch(`/api/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to update location");
          }
          queryClient.invalidateQueries({
            queryKey: getListLocationsQueryKey(),
          });
          setDirtySections({});
          toast.success("Location updated successfully");
          setLocation("/locations");
        })
        .catch((error) => {
          toast.error(error.message || "Failed to update location");
        });
    } else {
      createLocation.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListLocationsQueryKey(),
            });
            toast.success("Location created successfully");
            setLocation("/locations");
          },
          onError: (error: any) => {
            toast.error(error?.data?.error || "Failed to create location");
          },
        }
      );
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12 font-sans">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => confirmNavigation("/dashboard")}>Master Data</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" onClick={() => confirmNavigation("/locations")}>Locations</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">
          {isEdit ? "Edit Location" : "Add New Location"}
        </span>
      </nav>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Header Section */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">
                {isEdit ? "Edit Location Details" : "Add New Location"}
              </h2>
              <p className="text-[16px] text-slate-600 mt-1">
                {isEdit ? "Update warehouse, factory, or retail outlet configuration using section save buttons." : "Register a new warehouse, factory, or retail outlet for serialization tracking."}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => confirmNavigation("/locations")}
                className="px-6 py-2.5 border border-slate-200 text-[#0F172A] font-semibold rounded-lg hover:bg-slate-50 transition-colors h-auto cursor-pointer"
              >
                {isEdit ? "Back to Locations" : "Discard"}
              </Button>
              {!isEdit && (
                <Button
                  type="submit"
                  disabled={createLocation.isPending}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all flex items-center gap-2 active:scale-95 h-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Save Location
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Primary Details */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Section 1: Basic Location Details */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Basic Location Details</h3>
                    {isEdit && dirtySections["Basic Location Details"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Basic Location Details")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Basic Details
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          LOCATION TYPE <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all h-auto">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Warehouse">Warehouse</SelectItem>
                            <SelectItem value="Factory">Factory</SelectItem>
                            <SelectItem value="Distributor">Distributor</SelectItem>
                            <SelectItem value="Retailer">Retailer</SelectItem>
                            <SelectItem value="Transshipment Center">Transshipment Center</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="uniqueName"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          UNIQUE LOCATION CODE <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., WH-PUNE-01" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all uppercase font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          LOCATION NAME <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Pune Central Warehouse" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="gln"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          GLOBAL LOCATION NUMBER (GLN - 13 DIGITS)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 8901023000017 (13 digits numeric)" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Optional GS1 GLN code assigned to this factory, plant, or warehouse.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isMaster && (
                  <div className="mt-6">
                    <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block mb-2">
                      ASSIGN TO CLIENT COMPANY (OPTIONAL)
                    </label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all h-auto">
                        <SelectValue placeholder="No Company (System Location)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Company (System Location)</SelectItem>
                        {companies.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name} (ID: {c.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Super Master & Master accounts can create global system locations or assign to a specific client company.
                    </p>
                  </div>
                )}
              </section>

              {/* Section 2: Contact Information */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
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
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      CONTACT PERSON NAME
                    </label>
                    <Input 
                      placeholder="Enter full name" 
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactNo"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            PHONE NUMBER <span className="text-[#EF4444]">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="tel"
                              placeholder="+91 XXXX XXX XXX" 
                              className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        EMAIL ADDRESS
                      </label>
                      <Input 
                        type="email"
                        placeholder="contact@location.com" 
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Address Details */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                    <h3 className="text-lg font-bold text-[#0F172A]">Address Details</h3>
                    {isEdit && dirtySections["Address Details"] && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                  {isEdit && (
                    <Button
                      type="button"
                      onClick={() => handleSaveSection("Address Details")}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 h-9"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Address Details
                    </Button>
                  )}
                </div>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          STREET ADDRESS <span className="text-[#EF4444]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Plot No, Street, Landmark" 
                            className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            CITY <span className="text-[#EF4444]">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="City" 
                              className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            STATE / PROVINCE <span className="text-[#EF4444]">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="State" 
                              className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        COUNTRY
                      </label>
                      <Select onValueChange={setCountry} defaultValue={country}>
                        <SelectTrigger className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all h-auto">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                          <SelectItem value="Singapore">Singapore</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        ZIP / POSTAL CODE
                      </label>
                      <Input 
                        placeholder="Code" 
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Settings & Compliance */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Section 4: Compliance & Status */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Compliance & Status</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      LICENSE NUMBER
                    </label>
                    <Input 
                      placeholder="Serial/Reg No." 
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full bg-[#F8FAFC] border-[#E2E8F0] focus-visible:border-[#2563EB] focus-visible:ring-0 rounded-lg py-2.5 px-4 text-sm text-slate-900 transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      COMPANY GSTIN (READ ONLY)
                    </label>
                    <Input 
                      placeholder="No GSTIN registered" 
                      value={myCompany?.gstin || "Not Registered"}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border-[#E2E8F0] rounded-lg py-2.5 px-4 text-sm text-slate-500 font-mono uppercase cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              {/* Section 5: Map Integration Placeholder */}
              <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>pin_drop</span>
                  <h3 className="text-lg font-bold text-[#0F172A]">Map Location</h3>
                </div>
                <div className="w-full h-48 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden text-center p-4">
                  <div className="space-y-2">
                    <span className="material-symbols-outlined text-[#2563EB] text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>distance</span>
                    <p className="text-xs text-slate-500 font-medium">Automatic Coordinate Resolving</p>
                    <p className="text-[10px] text-slate-400">Map updates automatically based on the city and address fields.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
