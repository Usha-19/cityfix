import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BrainCircuit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { LogoMark } from "@/components/Logo";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

const demoAccounts = [
  { role: "Citizen", email: "citizen@demo.cityfix.app" },
  { role: "Officer", email: "officer@demo.cityfix.app" },
  { role: "Admin", email: "admin@cityfix.app" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.push("success", `Welcome back, ${user.full_name}`);
      nav("/app");
    } catch (e: any) {
      if (e?.response?.status === 401) {
        toast.push("error", "Invalid email or password");
      } else if (e?.response) {
        toast.push("error", e.response.data?.detail ?? "Login failed");
      } else {
        toast.push(
          "error",
          "Cannot reach the server. Make sure the backend is running at " +
            (import.meta.env.VITE_API_URL || "http://localhost:8000")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between overflow-hidden bg-navy-800 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="h-9 w-9 text-white" />
          <span className="text-lg font-bold">
            City<span className="text-teal-400">Fix</span>
          </span>
        </Link>
        <div>
          <BrainCircuit className="h-10 w-10 text-teal-400" />
          <h2 className="mt-4 max-w-sm text-2xl font-bold">
            Cities that remember. Problems that stay solved.
          </h2>
          <p className="mt-3 max-w-sm text-slate-300">
            Log in to report issues, investigate recurring problems, and act with full
            historical context.
          </p>
        </div>
        <p className="text-xs text-slate-400">Demo password for all seeded accounts: Demo1234!</p>
      </div>

      <div className="flex w-full items-center justify-center overflow-hidden p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center lg:hidden">
            <Link to="/">
              <span className="text-2xl font-bold text-navy-800">
                City<span className="text-teal-600">Fix</span>
              </span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-navy-800">Log in</h1>
          <p className="mt-1 text-sm text-slate-500">Access your CityFix workspace.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Log in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">Quick demo login</p>
            <div className="mt-2 flex flex-col gap-1">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setValue("email", a.email);
                    setValue("password", a.email.startsWith("admin") ? "ChangeMeStrong!123" : "Demo1234!");
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white"
                >
                  <span className="shrink-0 font-medium text-slate-700">{a.role}</span>
                  <span className="min-w-0 truncate text-slate-400">{a.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <Link to="/register" className="font-medium text-teal-600 hover:underline">
              Register as a citizen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
