import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Logo } from "@/components/Logo";

const schema = z.object({
  full_name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(8, "At least 8 characters"),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: signup } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await signup(data);
      toast.push("success", "Account created");
      nav("/app");
    } catch (e: any) {
      toast.push("error", e?.response?.data?.detail ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-card">
        <Link to="/">
          <Logo />
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-navy-800">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Public sign-up creates a citizen account. Officer and admin roles are assigned by an
          administrator.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <Label>Full name</Label>
            <Input placeholder="Jane Citizen" {...register("full_name")} />
            <FieldError>{errors.full_name?.message}</FieldError>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="you@example.com" {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input placeholder="+1 555 0100" {...register("phone")} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" placeholder="At least 8 characters" {...register("password")} />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-teal-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
