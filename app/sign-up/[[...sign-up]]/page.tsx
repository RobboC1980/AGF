import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join AgileForge
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account and start managing projects with AI assistance
          </p>
        </div>
        <SignUp />
      </div>
    </div>
  )
} 