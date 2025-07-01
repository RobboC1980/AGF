import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              logoImage: "w-20 h-20 mx-auto mb-6"
            }
          }}
        />
      </div>
    </div>
  )
} 