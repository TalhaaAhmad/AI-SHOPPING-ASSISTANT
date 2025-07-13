import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, ShoppingBag, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#dbeafe_1px,transparent_1px),linear-gradient(to_bottom,#dbeafe_1px,transparent_1px)] bg-[size:7rem_4rem]" />
      
      {/* Floating shopping icons */}
      <div className="absolute inset-0 -z-5 overflow-hidden">
        <ShoppingBag className="absolute top-20 left-10 h-8 w-8 text-blue-200 animate-pulse" />
        <Search className="absolute top-40 right-20 h-6 w-6 text-blue-300 animate-bounce" />
        <Sparkles className="absolute bottom-32 left-20 h-7 w-7 text-blue-200 animate-pulse" />
        <ShoppingBag className="absolute bottom-20 right-10 h-5 w-5 text-blue-300 animate-bounce" />
      </div>
      
      <section className="w-full px-4 py-8 max-w-7xl sm:px-6 lg:px-8 flex flex-col items-center space-y-10 text-center relative z-10">
        <header className="space-y-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-100 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">AI-Powered Shopping</span>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 bg-clip-text text-transparent">
            Your Smart Shopping
            <br />
            Assistant
          </h1>
          <p className="max-w-[700px] text-lg text-gray-600 md:text-xl/relaxed xl:text-2xl/relaxed">
            Discover the perfect products, compare prices, and make informed decisions with AI that understands your needs and preferences.
            <br />
            <span className="text-gray-400 text-sm">
              Powered by advanced AI to find exactly what you&apos;re looking for.
            </span>
          </p>
        </header>

        <SignedIn>
          <Link href="/dashboard">
            <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Start Shopping 
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </Link>
        </SignedIn>

        <SignedOut>
          <SignInButton
            mode="modal"
            fallbackRedirectUrl="/dashboard"
            forceRedirectUrl="/dashboard"
          >
            <button className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </SignInButton>
        </SignedOut>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 pt-8 max-w-4xl mx-auto">
          {[
            { 
              title: "Smart Search", 
              description: "Natural language product discovery",
              icon: Search
            },
            { 
              title: "Price Compare", 
              description: "Find the best deals across stores",
              icon: ShoppingBag
            },
            { 
              title: "Personalized", 
              description: "Recommendations tailored to you",
              icon: Sparkles
            },
          ].map(({ title, description, icon: Icon }) => (
            <div key={title} className="text-center group hover:scale-105 transition-transform duration-200">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-2">{title}</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
          ))}
        </div>

        {/* Additional value proposition */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Why Choose Our AI Shopping Assistant?
          </h3>
          <p className="text-gray-600 text-sm">
            Save time, money, and make better purchasing decisions with AI that learns your preferences, 
            tracks price changes, and finds products you didn&apos;t even know you needed.
          </p>
        </div>
      </section>
    </main>
  );
}