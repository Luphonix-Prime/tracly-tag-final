import { useState } from "react";
import { useGetCurrentUser, useListCompanies, getListCompaniesQueryKey, useCreateCompany, useDeleteCompany } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Trash2, Plus, Building2 } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  address: z.string().min(1, "Address is required"),
  gstin: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.trim().toUpperCase())
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]Z[A-Z0-9]?$/.test(val),
      "Invalid GSTIN format. Expected: 2-digit state code, 10-char PAN, 1-char registration code, 'Z', and optional check code (e.g., 24ZW9EE0GZLL1Z)."
    ),
});

export default function Companies() {
  const { data: user } = useGetCurrentUser();
  const { data: companies = [], isLoading } = useListCompanies();
  const createCompany = useCreateCompany();
  const deleteCompany = useDeleteCompany();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to create company");
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteCompany.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        toast.success("Company deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to delete company");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        <a className="text-[11px] font-bold hover:text-[#2563EB] transition-colors uppercase tracking-wider cursor-pointer" href="#">Master Data</a>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[11px] text-[#2563EB] uppercase tracking-wider font-bold">Companies</span>
      </div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[30px] leading-[36px] font-bold text-[#0F172A] tracking-[-0.02em]">Companies</h2>
          <p className="text-[16px] text-slate-600 mt-1">Manage tenant companies and their regulatory information.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#2563EB]/20 transition-all flex items-center gap-2 active:scale-95 h-auto">
              <Plus className="h-5 w-5" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="gstin" render={({ field }) => (
                  <FormItem><FormLabel>GSTIN <span className="text-muted-foreground text-xs">(optional)</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={createCompany.isPending}>Save Company</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 border-b border-[#E2E8F0] bg-[#faf8ff] flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="text-[18px] font-semibold text-[#0F172A]">Active Tenants</span>
            <span className="bg-[#ededf9] text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-left table-fixed">
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0] bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-slate-500 tracking-wider w-[30%] text-[11px] font-bold px-6 py-4 uppercase">NAME</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[20%] text-[11px] font-bold px-6 py-4 uppercase">EMAIL</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[15%] text-[11px] font-bold px-6 py-4 uppercase">GSTIN</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[25%] text-[11px] font-bold px-6 py-4 uppercase">ADDRESS</TableHead>
                <TableHead className="text-slate-500 tracking-wider w-[10%] text-[11px] font-bold px-6 py-4 uppercase text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 opacity-50" />
                      <p>No companies found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-slate-50 transition-colors group border-0">
                    <TableCell className="align-middle px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[#0F172A] truncate font-bold text-[14px]">{company.name}</span>
                        <span className="text-[11px] text-slate-500 opacity-70 font-semibold tracking-wide">UID: {company.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-[14px]">
                      <span className="text-slate-600 truncate block">{company.email}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-[14px]">
                      <span className="font-semibold tracking-wide text-slate-600">{company.gstin || '—'}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5 text-[14px]">
                      <span className="text-slate-600 truncate block" title={company.address}>{company.address}</span>
                    </TableCell>
                    <TableCell className="align-middle px-6 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete {company.name} and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(company.id)} className="bg-red-500 text-white hover:bg-red-600">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
