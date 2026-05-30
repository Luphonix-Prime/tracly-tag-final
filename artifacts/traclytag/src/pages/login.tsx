import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useLogin, useRegister, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { QrCode, Loader2, MapPin, Mail, Lock, User, Phone, Building2, Globe } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaMicrosoft } from "react-icons/fa";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  location: z.string().optional(),
});

const signUpSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company Name is required"),
  companyEmail: z.string().email("Invalid company email"),
  companyWebsiteUrl: z.string().min(1, "Website URL is required"),
  location: z.string().optional(),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      location: "",
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      phone: "",
      companyName: "",
      companyEmail: "",
      companyWebsiteUrl: "",
      location: "",
    },
  });

  const fetchLocationAutomatically = (formType: "login" | "signUp") => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);
    toast.info("Fetching your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { signal: controller.signal, headers: { "User-Agent": "TraclyTag-App" } }
          );

          clearTimeout(timeoutId);

          if (!response.ok) throw new Error("Geocoding failed");

          const data = await response.json();
          const address = data.display_name || 
            (data.address ? `${data.address.city || data.address.town || ""}, ${data.address.state || ""}, ${data.address.country || ""}`.trim() : null);

          if (address) {
            if (formType === "login") {
              loginForm.setValue("location", address);
            } else {
              signUpForm.setValue("location", address);
            }
            toast.success("Location auto-fetched successfully");
          } else {
            const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (formType === "login") {
              loginForm.setValue("location", coords);
            } else {
              signUpForm.setValue("location", coords);
            }
            toast.success("Coordinates auto-fetched");
          }
        } catch (err) {
          const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (formType === "login") {
            loginForm.setValue("location", coords);
          } else {
            signUpForm.setValue("location", coords);
          }
          toast.success("Coordinates fetched (Geocoding unavailable)");
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        setIsFetchingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enter manually.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable. Please enter manually.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Please enter manually.");
            break;
          default:
            toast.error("Failed to fetch location automatically.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    const loginData = {
      username: values.username,
      password: values.password,
    };
    loginMutation.mutate({ data: loginData }, {
      onSuccess: () => {
        if (values.location) {
          localStorage.setItem("traclytag_login_location", values.location);
        } else {
          localStorage.removeItem("traclytag_login_location");
        }
        toast.success("Logged in successfully");
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Invalid username or password");
      }
    });
  }

  function onSignUpSubmit(values: z.infer<typeof signUpSchema>) {
    const signUpData = {
      username: values.username,
      email: values.email,
      password: values.password,
      phone: values.phone || null,
      companyName: values.companyName,
      companyEmail: values.companyEmail,
      companyWebsiteUrl: values.companyWebsiteUrl,
    };
    registerMutation.mutate({ data: signUpData }, {
      onSuccess: () => {
        if (values.location) {
          localStorage.setItem("traclytag_login_location", values.location);
        } else {
          localStorage.removeItem("traclytag_login_location");
        }
        toast.success("Account & Company registered successfully");
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast.error(error?.data?.error || "Registration failed. Username may already exist.");
      }
    });
  }

  const handleSsoLogin = (provider: string) => {
    toast.info(`Single Sign-On (SSO) with ${provider} is initiating...`);
  };

  // Animation variants for staggering children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } as const },
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row bg-background">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Left Panel: Form */}
      <div className="flex w-full flex-col items-center justify-center p-6 sm:p-8 md:p-12 md:w-1/2 overflow-y-auto">
        <div className="w-full max-w-md">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-5"
          >
            {/* Logo branding block */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500/10 rounded-full">
                <QrCode className="h-6 w-6 text-indigo-600 animate-pulse" />
              </div>
              <span className="text-xl font-bold tracking-wider text-indigo-600">TraclyTag</span>
            </motion.div>

            {/* Header title */}
            <motion.div variants={itemVariants} className="text-left">
              <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage serial tracking & DataMatrix code generation</p>
            </motion.div>

            {/* Forms Tabs Container */}
            <motion.div variants={itemVariants} className="w-full">
              <Tabs defaultValue="login" className="w-full">
                <div className="flex items-center justify-between border-b pb-3.5 mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Authentication Mode</span>
                  <TabsList className="grid grid-cols-2 w-[160px] h-8 p-0.5">
                    <TabsTrigger value="login" className="text-xs py-1">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="text-xs py-1">Sign Up</TabsTrigger>
                  </TabsList>
                </div>
                
                {/* Sign In form tab */}
                <TabsContent value="login" className="space-y-5">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Username</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <User className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Enter username" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Password</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Lock className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter password" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Location</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-1.5 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <MapPin className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Enter starting location (optional)" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => fetchLocationAutomatically("login")}
                                disabled={isFetchingLocation}
                                title="Fetch Location Automatically"
                                className="shrink-0 h-9 w-9 rounded-full hover:bg-muted"
                              >
                                {isFetchingLocation ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <MapPin className="h-4.5 w-4.5" />
                                )}
                              </Button>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-3 h-12 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                      </Button>

                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-background px-2 text-muted-foreground font-medium">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("Google")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FcGoogle className="h-4 w-4" />
                          <span>Google</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("Microsoft")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FaMicrosoft className="h-3.5 w-3.5 text-[#00a4ef]" />
                          <span>Microsoft</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("GitHub")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FaGithub className="h-4 w-4" />
                          <span>GitHub</span>
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                {/* Sign Up form tab */}
                <TabsContent value="signup">
                  <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 border-b pb-1 mb-2 mt-2">User Credentials</div>
                      
                      <FormField
                        control={signUpForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Username</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <User className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Enter username" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Email</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Mail className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="user@corp.com" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signUpForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Password</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Lock className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Minimum 6 characters" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Phone</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Phone className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Phone number (optional)" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 border-b pb-1 mb-2 mt-4">Company Details</div>

                      <FormField
                        control={signUpForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Company Name</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Building2 className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Acme Corporation" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="companyEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Company Email</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Mail className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="info@corp.com" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signUpForm.control}
                        name="companyWebsiteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Company Website URL</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-2 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <Globe className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="https://www.company.com" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signUpForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs ml-3 text-muted-foreground font-medium">Active Session Location</FormLabel>
                            <div className="flex items-center w-full bg-background border border-gray-300/60 h-12 rounded-full overflow-hidden pl-5 pr-1.5 gap-3 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                              <MapPin className="h-4.5 w-4.5 text-gray-500/80 shrink-0" />
                              <FormControl>
                                <Input 
                                  placeholder="Start location (optional)" 
                                  className="bg-transparent border-0 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full h-full p-0" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => fetchLocationAutomatically("signUp")}
                                disabled={isFetchingLocation}
                                title="Fetch Location Automatically"
                                className="shrink-0 h-9 w-9 rounded-full hover:bg-muted"
                              >
                                {isFetchingLocation ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                ) : (
                                  <MapPin className="h-4.5 w-4.5" />
                                )}
                              </Button>
                            </div>
                            <FormMessage className="ml-3 text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full mt-4 h-12 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Register Company & Admin
                      </Button>

                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                          <span className="bg-background px-2 text-muted-foreground font-medium">
                            Or register with
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("Google")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FcGoogle className="h-4 w-4" />
                          <span>Google</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("Microsoft")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FaMicrosoft className="h-3.5 w-3.5 text-[#00a4ef]" />
                          <span>Microsoft</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSsoLogin("GitHub")}
                          className="w-full text-xs py-1 h-10 rounded-full flex items-center justify-center gap-1.5 border-gray-300/60 hover:bg-muted font-medium"
                        >
                          <FaGithub className="h-4 w-4" />
                          <span>GitHub</span>
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* Demo Credentials Footer */}
            <motion.div 
              variants={itemVariants}
              className="bg-muted/50 text-[9px] text-muted-foreground flex flex-col items-start gap-1 p-3 rounded-2xl border mt-3"
            >
              <div className="font-semibold text-foreground">Demo Credentials:</div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-1 w-full text-[9px]">
                <div>Master: <code className="bg-background px-1 rounded text-foreground font-medium">master</code> / <code className="bg-background px-1 rounded text-foreground">master123</code></div>
                <div>Admin: <code className="bg-background px-1 rounded text-foreground font-medium">demo_admin</code> / <code className="bg-background px-1 rounded text-foreground">admin123</code></div>
                <div>Op: <code className="bg-background px-1 rounded text-foreground font-medium">demo_op</code> / <code className="bg-background px-1 rounded text-foreground">op123</code></div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* Right Panel: Image */}
      <div className="relative hidden w-1/2 md:block">
        <img
          src="https://images.unsplash.com/photo-1714715350295-5f00e902f0d7?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2FsbHBhZXJ8ZW58MHwxfDB8fHww&auto=format&fit=crop&q=60&w=900"
          alt="A beautiful landscape with rolling hills and a road."
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
      </div>
    </div>
  );
}