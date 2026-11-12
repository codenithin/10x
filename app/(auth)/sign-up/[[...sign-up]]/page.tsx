import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Nvelop 10x</h1>
          <p className="text-slate-400 mt-1">Create your workspace</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
