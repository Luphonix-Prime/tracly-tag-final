import { useState } from "react";
import {
  useListLocations,
  getListLocationsQueryKey,
  useCreateLocation,
  useDeleteLocation,
  useGetCurrentUser,
  useListCompanies,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Trash2, Plus, MapPin } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";

const locationSchema = z.object({
  locationType: z.string().min(1, "Type is required"),
  uniqueName: z.string().min(1, "Unique name is required"),
  locationName: z.string().min(1, "Location name is required"),
  contactNo: z.string().min(1, "Contact number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  companyId: z.coerce.number().optional(),
});

type LocationForm = z.infer<typeof locationSchema>;

export default function Locations() {
  const { data: currentUser } = useGetCurrentUser();
  const isMaster = currentUser?.role === "master";
  const { data: companies = [] } = useListCompanies({ query: { enabled: isMaster } } as any);

  const { data: locations = [], isLoading } = useListLocations();
  const createLocation = useCreateLocation();
  const deleteLocation = useDeleteLocation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      companyId: undefined,
    },
  });

  const onSubmit = (values: LocationForm) => {
    if (isMaster && !values.companyId) {
      form.setError("companyId", { type: "manual", message: "Company context is required for Master Admin" });
      return;
    }
    const payload = {
      ...values,
      companyId: isMaster ? values.companyId : undefined,
    };
    createLocation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListLocationsQueryKey(),
          });
          toast.success("Location created");
          setIsCreateOpen(false);
          form.reset();
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || "Failed to create location");
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteLocation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListLocationsQueryKey(),
          });
          toast.success("Location deleted");
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || "Failed to delete location");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations Master"
        description="Warehouses, distributors, and retail outlets"
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {isMaster && (
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Context</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(Number(val))}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a company context" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="locationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Warehouse, Distributor, Retailer…"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="uniqueName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unique Code</FormLabel>
                          <FormControl>
                            <Input placeholder="WH-PUNE-01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Location Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
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
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="submit"
                      disabled={createLocation.isPending}
                    >
                      Save Location
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
                <TableHead>Unique Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location Name</TableHead>
                <TableHead>City / State</TableHead>
                <TableHead>Contact</TableHead>
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
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <MapPin className="h-8 w-8 text-muted-foreground/50" />
                      <p>No locations yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono font-medium">
                      {location.uniqueName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {location.locationType}
                      </Badge>
                    </TableCell>
                    <TableCell>{location.locationName}</TableCell>
                    <TableCell>
                      {[location.city, location.state]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {location.contactNo}
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
                            <AlertDialogTitle>Delete location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently remove {location.locationName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(location.id)}
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
