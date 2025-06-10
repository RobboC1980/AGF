"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle,
  Loader2 
} from "lucide-react"
import { toast } from "sonner"

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

const registerSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
})

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

const resetPasswordSchema = z.object({
  new_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirm_password: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: "login" | "register" | "forgot-password" | "reset-password"
  resetToken?: string
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
  resetToken,
}) => {
  const { login, register, requestPasswordReset, confirmPasswordReset, isLoading } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize with reset mode if token is provided
  React.useEffect(() => {
    if (resetToken && initialMode === "reset-password") {
      setMode("reset-password")
    }
  }, [resetToken, initialMode])

  // Form configurations
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
    },
  })

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  })

  const resetAllForms = () => {
    loginForm.reset()
    registerForm.reset()
    forgotPasswordForm.reset()
    resetPasswordForm.reset()
    setSuccess(null)
    setError(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleClose = () => {
    resetAllForms()
    onClose()
  }

  const handleLogin = async (data: LoginForm) => {
    setError(null)
    setSuccess(null)

    const result = await login(data.email, data.password)
    
    if (result.success) {
      toast.success("Login successful!")
      handleClose()
    } else {
      setError(result.error || "Login failed")
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    setError(null)
    setSuccess(null)

    const result = await register(data)
    
    if (result.success) {
      toast.success("Registration successful!")
      handleClose()
    } else {
      setError(result.error || "Registration failed")
    }
  }

  const handleForgotPassword = async (data: ForgotPasswordForm) => {
    setError(null)
    setSuccess(null)

    const result = await requestPasswordReset(data.email)
    
    if (result.success) {
      setSuccess(result.message || "Password reset link sent to your email")
      forgotPasswordForm.reset()
    } else {
      setError(result.error || "Failed to send password reset email")
    }
  }

  const handleResetPassword = async (data: ResetPasswordForm) => {
    setError(null)
    setSuccess(null)

    if (!resetToken) {
      setError("Invalid reset token")
      return
    }

    const result = await confirmPasswordReset(resetToken, data.new_password)
    
    if (result.success) {
      setSuccess(result.message || "Password reset successful")
      resetPasswordForm.reset()
      // Redirect to login after a delay
      setTimeout(() => {
        setMode("login")
        setSuccess(null)
      }, 2000)
    } else {
      setError(result.error || "Password reset failed")
    }
  }

  const getModeConfig = () => {
    switch (mode) {
      case "login":
        return {
          title: "Welcome Back",
          description: "Sign in to your AgileForge account",
          icon: User,
        }
      case "register":
        return {
          title: "Create Account",
          description: "Join AgileForge to get started",
          icon: User,
        }
      case "forgot-password":
        return {
          title: "Reset Password",
          description: "Enter your email to receive a reset link",
          icon: Mail,
        }
      case "reset-password":
        return {
          title: "Set New Password",
          description: "Enter your new password",
          icon: Lock,
        }
    }
  }

  const config = getModeConfig()
  const IconComponent = config.icon

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <IconComponent size={16} className="text-white" />
            </div>
            <span>{config.title}</span>
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...loginForm.register("email")}
                  className={loginForm.formState.errors.email ? "border-red-500" : ""}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...loginForm.register("password")}
                    className={loginForm.formState.errors.password ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600 hover:text-blue-500"
                  onClick={() => setMode("forgot-password")}
                >
                  Forgot Password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setMode("register")}
                  className="text-slate-600 hover:text-slate-500"
                >
                  Don't have an account? Sign up
                </Button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === "register" && (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="First name"
                    {...registerForm.register("first_name")}
                    className={registerForm.formState.errors.first_name ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.first_name && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.first_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Last name"
                    {...registerForm.register("last_name")}
                    className={registerForm.formState.errors.last_name ? "border-red-500" : ""}
                  />
                  {registerForm.formState.errors.last_name && (
                    <p className="text-sm text-red-500">
                      {registerForm.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose a username"
                  {...registerForm.register("username")}
                  className={registerForm.formState.errors.username ? "border-red-500" : ""}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register_email">Email</Label>
                <Input
                  id="register_email"
                  type="email"
                  placeholder="Enter your email"
                  {...registerForm.register("email")}
                  className={registerForm.formState.errors.email ? "border-red-500" : ""}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register_password">Password</Label>
                <div className="relative">
                  <Input
                    id="register_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    {...registerForm.register("password")}
                    className={registerForm.formState.errors.password ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setMode("login")}
                  className="text-slate-600 hover:text-slate-500"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === "forgot-password" && (
            <div className="space-y-4">
              <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot_email">Email</Label>
                  <Input
                    id="forgot_email"
                    type="email"
                    placeholder="Enter your email address"
                    {...forgotPasswordForm.register("email")}
                    className={forgotPasswordForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {forgotPasswordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setMode("login")}
                  className="text-slate-600 hover:text-slate-500"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}

          {/* Reset Password Form */}
          {mode === "reset-password" && (
            <div className="space-y-4">
              <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      {...resetPasswordForm.register("new_password")}
                      className={resetPasswordForm.formState.errors.new_password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  {resetPasswordForm.formState.errors.new_password && (
                    <p className="text-sm text-red-500">
                      {resetPasswordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      {...resetPasswordForm.register("confirm_password")}
                      className={resetPasswordForm.formState.errors.confirm_password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  {resetPasswordForm.formState.errors.confirm_password && (
                    <p className="text-sm text-red-500">
                      {resetPasswordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 