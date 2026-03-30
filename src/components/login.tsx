import { useState, type FormEvent } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await signUp.email({ email, password, name });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">
                      {mode === "login" ? "Welcome back" : "Create account"}
                    </h1>
                    <p className="text-balance text-muted-foreground">
                      {mode === "login"
                        ? "Sign in to your Volund account"
                        : "Get started with Volund"}
                    </p>
                  </div>
                  {mode === "register" && (
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Name
                      </label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {mode === "register" ? "Creating..." : "Signing in..."}
                      </>
                    ) : mode === "register" ? (
                      "Create account"
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {mode === "login" ? (
                      <>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          className="underline underline-offset-4 hover:text-primary"
                          onClick={() => {
                            setMode("register");
                            setError("");
                          }}
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          className="underline underline-offset-4 hover:text-primary"
                          onClick={() => {
                            setMode("login");
                            setError("");
                          }}
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </form>
              <div className="relative hidden bg-muted md:block">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4 px-8">
                    <div className="text-6xl font-bold text-primary/10">V</div>
                    <p className="text-lg font-medium text-muted-foreground/60">
                      Multi-Agent AI Platform
                    </p>
                    <p className="text-sm text-muted-foreground/40">
                      Chat with specialist agents that research, code, manage
                      email, and more — all working together on your behalf.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-balance text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
