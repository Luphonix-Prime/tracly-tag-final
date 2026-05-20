import { useState } from "react";
import { useListBatches, getListBatchesQueryKey, useCreateBatch, useDeleteBatch, useListProducts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Trash2, Plus, Layers, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const batchSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  mfgDate: z.date({ required_error: "Manufacturing date is required" }),
  expiryDate: z.date({ required_error: "Expiry date is required" }),
});

export default function Batches() {
  const [filterProductId, setFilterProductId] = useState<number | undefined>();
  const { data: products = [] } = useListProducts();
  const { data: batches = [], isLoading } = useListBatches({ productId: filterProductId });
  
  const createBatch = useCreateBatch();
  const deleteBatch = useDeleteBatch();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof batchSchema>>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      productId: undefined,
      batchNumber: "",
      mfgDate: undefined as any,
      expiryDate: undefined as any,
    },
  });

  const onSubmit = (values: z.infer<typeof batchSchema>) => {
    const payload = {
      productId: values.productId,
      batchNumber: values.batchNumber,
      mfgDate: format(values.mfgDate, "yyyy-MM-dd"),
      expiryDate: format(values.expiryDate, "yyyy-MM-dd"),
    };

    createBatch.mutate({ data: payload as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        toast.success("Batch created successfully");
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to create batch");
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteBatch.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        toast.success("Batch deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to delete batch. It may be in use.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Production Batches" 
        description="Manage product batches and expiry dates" 
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Batch</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Batch</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="productId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="batchNumber" render={({ field }) => (
                    <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField
                    control={form.control}
                    name="mfgDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Manufacturing</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick manufacturing date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Expiry</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createBatch.isPending}>Save Batch</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Filter by Product:</span>
            <Select value={filterProductId?.toString() || "all"} onValueChange={(val) => setFilterProductId(val === "all" ? undefined : parseInt(val))}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Mfg Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-muted-foreground/50" />
                      <p>No batches found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono font-medium text-primary">{batch.batchNumber}</TableCell>
                    <TableCell>{batch.productName || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {batch.mfgDate ? format(new Date(batch.mfgDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {batch.expiryDate ? format(new Date(batch.expiryDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(batch.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete batch {batch.batchNumber}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(batch.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
