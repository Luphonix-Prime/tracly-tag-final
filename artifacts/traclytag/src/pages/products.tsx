import { useState } from "react";
import {
  useListProducts,
  getListProductsQueryKey,
  useCreateProduct,
  useDeleteProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Trash2, Plus, Package } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const productSchema = z.object({
  skuId: z.string().min(1, "SKU ID required"),
  name: z.string().min(1, "Name required"),
  skuSize: z.string().min(1, "SKU size required"),
  marketedBy: z.string().min(1, "Marketed by required"),
  sapDescription: z.string().optional().or(z.literal("")),
  gtin: z.string().regex(/^\d{13,14}$/, "GTIN must be 13–14 digits"),
  mrp: z.coerce.number().positive("MRP must be positive"),
  registrationNo: z.string().optional().or(z.literal("")),
  l1Size: z.coerce.number().int().min(1),
  l2Size: z.coerce.number().int().min(1),
  shipperSize: z.coerce.number().int().min(1),
  cautionLogoUrl: z
    .string()
    .url("Must be a URL")
    .optional()
    .or(z.literal("")),
  productLogoUrl: z
    .string()
    .url("Must be a URL")
    .optional()
    .or(z.literal("")),
  labelPdfUrl: z.string().url("Must be a URL").optional().or(z.literal("")),
});

type ProductForm = z.infer<typeof productSchema>;

export default function Products() {
  const { data: products = [], isLoading } = useListProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      skuId: "",
      name: "",
      skuSize: "",
      marketedBy: "",
      sapDescription: "",
      gtin: "",
      mrp: 0,
      registrationNo: "",
      l1Size: 10,
      l2Size: 100,
      shipperSize: 1000,
      cautionLogoUrl: "",
      productLogoUrl: "",
      labelPdfUrl: "",
    },
  });

  const onSubmit = (values: ProductForm) => {
    const payload = {
      ...values,
      sapDescription: values.sapDescription || undefined,
      registrationNo: values.registrationNo || undefined,
      cautionLogoUrl: values.cautionLogoUrl || undefined,
      productLogoUrl: values.productLogoUrl || undefined,
      labelPdfUrl: values.labelPdfUrl || undefined,
    };
    createProduct.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          toast.success("Product created");
          setIsCreateOpen(false);
          form.reset();
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || "Failed to create product");
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          toast.success("Product deleted");
        },
        onError: (error: any) => {
          toast.error(
            error?.data?.error || "Failed to delete product (it may be in use)",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Master"
        description="Define SKUs, GTINs, and packaging hierarchies"
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="skuId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU ID</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="gtin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GTIN (13–14 digits)</FormLabel>
                              <FormControl>
                                <Input className="font-mono" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="skuSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU Size</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="10x10 Tablets"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mrp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MRP (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="marketedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marketed By</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sapDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SAP Description (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrationNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registration No (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4 border p-4 rounded-md">
                        <div className="col-span-3 text-sm font-medium text-muted-foreground">
                          Packaging Hierarchy (units per pack)
                        </div>
                        <FormField
                          control={form.control}
                          name="l1Size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>L1 Size</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="l2Size"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>L2 Size</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shipperSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shipper Size</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4 border p-4 rounded-md">
                        <div className="text-sm font-medium text-muted-foreground">
                          Asset URLs (optional)
                        </div>
                        <FormField
                          control={form.control}
                          name="cautionLogoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Caution Logo URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://…"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="productLogoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Logo URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://…"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="labelPdfUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label PDF URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://…"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter className="pt-4 mt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProduct.isPending}>
                      Save Product
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>GTIN</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead>Pack (L1/L2/Shipper)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <p>No products yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.skuId}</TableCell>
                    <TableCell>
                      <div>{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.skuSize}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {product.gtin}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{product.mrp.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.l1Size} / {product.l2Size} / {product.shipperSize}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently remove {product.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
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
