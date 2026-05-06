import { useState } from "react";
import { useGetCurrentUser, useListUsers, getListUsersQueryKey, useCreateUser, useDeleteUser, useListCompanies } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Trash2, Plus, Users as UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const userSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["master", "client_admin", "operator"]),
  companyId: z.coerce.number().optional(),
});

export default function Users() {
  const { data: currentUser } = useGetCurrentUser();
  const { data: users = [], isLoading } = useListUsers();
  const { data: companies = [] } = useListCompanies({ query: { enabled: currentUser?.role === "master" } } as any);
  
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isMaster = currentUser?.role === "master";

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { 
      username: "", 
      email: "", 
      phone: "", 
      password: "", 
      role: "operator",
      companyId: isMaster ? undefined : currentUser?.companyId || undefined
    },
  });

  const onSubmit = (values: z.infer<typeof userSchema>) => {
    // Force companyId for non-master users to prevent creation outside their company
    if (!isMaster && currentUser?.companyId) {
      values.companyId = currentUser.companyId;
    }
    
    createUser.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success("User created successfully");
        setIsCreateOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to create user");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    
    deleteUser.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast.success("User deleted successfully");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Failed to delete user");
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users" 
        description="Manage system access and roles" 
        action={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isMaster && <SelectItem value="master">Master Admin</SelectItem>}
                          <SelectItem value="client_admin">Client Admin</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {isMaster && form.watch("role") !== "master" && (
                    <FormField control={form.control} name="companyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createUser.isPending}>Save User</Button>
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
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                {isMaster && <TableHead>Company</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isMaster ? 5 : 4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMaster ? 5 : 4} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
                      <p>No users found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((userRow) => (
                  <TableRow key={userRow.id}>
                    <TableCell className="font-medium">
                      {userRow.username}
                      {userRow.id === currentUser?.id && <Badge variant="outline" className="ml-2 text-[10px]">YOU</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={userRow.role === 'master' ? 'default' : userRow.role === 'client_admin' ? 'secondary' : 'outline'}>
                        {userRow.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{userRow.email || '-'}</div>
                      <div className="text-xs text-muted-foreground">{userRow.phone || '-'}</div>
                    </TableCell>
                    {isMaster && <TableCell>{(userRow as any).companyName || '-'}</TableCell>}
                    <TableCell className="text-right">
                      {userRow.id !== currentUser?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hidden text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {userRow.username}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(userRow.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
