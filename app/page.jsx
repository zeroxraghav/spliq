import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FEATURES, STEPS } from "@/lib/landing";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col pt-16 bg-gradient-to-br from-[#d0f8ce] to-[#f9fbe7]">
      {/* Hero */}
      <section className="mt-20 pb-16 space-y-10">
        <div className="container mx-auto px-4 text-center space-y-6">
          <Badge variant="outline" className="bg-green-100 text-green-500 px-2 text-md" >Simplify expenses</Badge>

          <h1 className="gradient-title mx-auto text-5xl max-w-4xl font-bold"> Smartest way to split expenses with your dumb friends</h1>
          <p className="mx-auto text-gray-500 max-w-[700px] md:text-xl/relaxed">Track shared expenses. Settle up in a click. Trips just got better <span className="text-blue-700">FR</span></p>
        </div>

        <div className="flex flex-row justify-center gap-2">
          <Button className="bg-green-600 hover:bg-green-700 border-none text-lg">
            <Link href='/'>Get Started</Link>
            <ArrowRight className="ml-2 h-2 w-4"/>
          </Button>

          <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-100 text-lg">
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>

        <div className="container mx-auto max-w-5xl overflow-hidden rounded-xl shadow-xl">
        <div className="bg-green-500 p-1 aspect-[16/9] transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]">
          <Image
            src="/hero2.png"
            width={1280}
            height={720}
            alt="Banner"
            className="rounded-lg mx-auto"
            priority
          />
        </div>
      </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <Badge variant="outline" className="bg-green-100 text-green-500 px-2 text-md" > Features </Badge>
          <h2 className="gradient-title mt-2 text-3xl md:text-4xl font-bold">
            Everything you need to split expenses
          </h2>
          <p className="mx-auto mt-3 max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Our platform provides all the tools you need to handle shared
            expenses with ease.
          </p>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, Icon, bg, color, description }) => (
              <Card
                key={title}
                className="flex flex-col items-center space-y-4 p-6 text-center"
              >
                <div className={`rounded-full p-3 ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>

                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-500">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <Badge variant="outline" className="bg-green-100 text-green-500 px-2 text-md" > How it works </Badge>
          <h2 className="gradient-title mt-2 text-3xl md:text-4xl font-bold">
            Splitting expenses has never been easier
          </h2>
          <p className="mx-auto mt-3 max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Follow these simple steps to start tracking and splitting expenses
            with friends.
          </p>

          <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
            {STEPS.map(({ label, title, description }) => (
              <div key={label} className="flex flex-col items-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600">
                  {label}
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-500 text-center">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-teal-400">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl text-white">
            Ready to simplify expense sharing?
          </h2>
          <p className="mx-auto max-w-[600px] text-green-100 md:text-xl/relaxed">
            Join thousands of users who have made splitting expenses
            stress-free.
          </p>
          <Button asChild size="lg" className="bg-green-800 hover:opacity-90">
            <Link href="/dashboard">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t bg-gray-50 py-12 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WhoPay. All rights reserved.
      </footer>
    </div>
  );
}
