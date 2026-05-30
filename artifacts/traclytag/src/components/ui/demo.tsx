import { AuthFormSplitScreen } from "@/components/ui/login";

// A simple utility to simulate an API call
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AuthFormSplitScreenDemo() {
  // Define the submission handler
  const handleLogin = async (data: any) => {
    console.log("Form submitted with:", data);
    // Simulate network request
    await sleep(2000);
    // You could throw an error here to test the error state
    // throw new Error("Invalid credentials");
    alert("Login successful!");
  };

  return (
    <AuthFormSplitScreen
      logo={
        <h1 className="text-xl font-bold text-red-500 tracking-wider">21st.dev</h1>
      }
      title="Welcome!"
      description="Sign in by entering the information below"
      imageSrc="https://images.unsplash.com/photo-1714715350295-5f00e902f0d7?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8d2FsbHBhZXJ8ZW58MHwxfDB8fHww&auto=format&fit=crop&q=60&w=900"
      imageAlt="A beautiful landscape with rolling hills and a road."
      onSubmit={handleLogin}
      forgotPasswordHref="#"
      createAccountHref="#"
    />
  );
}
