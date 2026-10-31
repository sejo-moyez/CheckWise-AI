import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth, useToast } from "./state";
import { Button, Card, ErrorBox, Logo } from "./components";

export const registrationSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
  first_name: z.string().min(1, "Tell us your name.").max(150),
  referral_code: z.string().max(12),
});
const loginSchema = registrationSchema
  .pick({ email: true, password: true })
  .extend({ password: z.string().min(1, "Enter your password.") });
type FormValues = z.infer<typeof registrationSchema>;
export function AuthPage({
  register: isRegistration = false,
}: {
  register?: boolean;
}) {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isRegistration ? registrationSchema : loginSchema,
    ) as never,
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      referral_code: params.get("ref") || "",
    },
  });
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isRegistration) await api.post("auth/register/", data);
      await auth.login(data.email, data.password);
    },
    onSuccess: () => {
      toast(
        isRegistration
          ? "Welcome. Check your email to verify your account."
          : "Welcome back.",
      );
      navigate("/app");
    },
  });
  return (
    <div className="auth-layout">
      <div className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
          <h1>
            Your next great
            <br />
            draft starts here.
          </h1>
          <p>
            One private workspace for originality, insight, and a voice that
            feels like you.
          </p>
          <ul className="check-list">
            <li>
              <Check /> Transparent, contextual reports
            </li>
            <li>
              <Check /> Simple, credit-based pricing
            </li>
            <li>
              <Check /> Your work, in your control
            </li>
          </ul>
        </div>
        <span className="auth-story-footer">
          <ShieldCheck size={16} /> Built around your writing.
        </span>
      </div>
      <div className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow">
            {isRegistration
              ? "MAKE ROOM FOR YOUR IDEAS"
              : "GOOD TO SEE YOU AGAIN"}
          </span>
          <h1>{isRegistration ? "Create your account" : "Welcome back."}</h1>
          <p>
            {isRegistration
              ? "A clearer view of your writing is one step away."
              : "Sign in to pick up where you left off."}
          </p>
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            noValidate
          >
            {isRegistration && (
              <label>
                Your name
                <input
                  autoComplete="given-name"
                  {...register("first_name")}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && (
                  <small className="field-error">
                    {errors.first_name.message}
                  </small>
                )}
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <small className="field-error">{errors.email.message}</small>
              )}
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  isRegistration ? "new-password" : "current-password"
                }
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <small className="field-error">{errors.password.message}</small>
              )}
            </label>
            {isRegistration ? (
              <>
                <label>
                  Referral code <span className="muted">(optional)</span>
                  <input {...register("referral_code")} maxLength={12} />
                </label>
                <small>
                  By creating an account, you accept our{" "}
                  <Link to="/terms">Terms</Link> and{" "}
                  <Link to="/privacy">Privacy Policy</Link>.
                </small>
              </>
            ) : (
              <Link className="forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            )}
            <ErrorBox error={mutation.error} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Please wait…"
                : isRegistration
                  ? "Create account"
                  : "Sign in"}{" "}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            {isRegistration ? "Already have an account?" : "New to CheckWise?"}{" "}
            <Link to={isRegistration ? "/login" : "/register"}>
              {isRegistration ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export function RecoveryPage({
  reset = false,
  verify = false,
}: {
  reset?: boolean;
  verify?: boolean;
}) {
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const { reload, user } = useAuth();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const path = verify ? "verify" : reset ? "reset" : "forgot";
      const { data } = await api.post<{ detail: string }>(`auth/${path}/`, {
        ...Object.fromEntries(form),
        token: params.get("token"),
        uid: params.get("uid"),
      });
      if (verify && user) await reload();
      return data;
    },
    onSuccess: () => setDone(true),
  });
  return (
    <div className="container public-page narrow">
      <Card>
        <h1>
          {verify
            ? "Verify your email"
            : reset
              ? "Choose a new password"
              : "Reset your password"}
        </h1>
        <p>
          {verify
            ? "Confirm this email address to unlock your workspace."
            : reset
              ? "Use a unique password of at least 10 characters."
              : "We’ll send a reset link if an account matches your email."}
        </p>
        {done ? (
          <>
            <div role="status" className="notice">
              {mutation.data?.detail}
            </div>
            <Button to={verify && user ? "/app" : "/login"}>
              Continue <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(new FormData(e.currentTarget));
            }}
          >
            {!verify &&
              (reset ? (
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                  />
                </label>
              ) : (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </label>
              ))}
            <ErrorBox error={mutation.error} />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Please wait…"
                : verify
                  ? "Verify email"
                  : reset
                    ? "Save password"
                    : "Send reset link"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
