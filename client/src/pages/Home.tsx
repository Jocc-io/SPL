import { useSales } from '@/hooks/use-solana-program';
import { SaleCard } from '@/components/SaleCard';
import {
  ArrowRight,
  Coins,
  Loader2,
  Palette,
  Rocket,
  Search,
  Shield,
  Cpu,
  Zap,
  Globe,
  Layers,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useState } from 'react';

export default function Home() {
  const { data: sales, isLoading } = useSales();
  const [isPlaying, setIsPlaying] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">
          Scanning Solana Network...
        </p>
      </div>
    );
  }

  const now = Date.now() / 1000;

  const allLiveSales =
    sales
      ?.filter((s) => s.account.startTime <= now && s.account.endTime > now)
      .sort((a, b) => b.account.startTime - a.account.startTime) || [];

  const liveSales = allLiveSales.slice(0, 5);

  const upcomingSales = sales?.filter((s) => s.account.startTime > now) || [];

  const endedSales = sales?.filter((s) => s.account.endTime <= now) || [];

  const features = [
    {
      title: 'Fully Decentralized',
      description:
        'No central authority or custody. All transactions happen directly between users and smart contracts.',
      icon: Shield,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Fast & Scalable',
      description:
        "Leveraging Solana's high-throughput architecture for near-instant transactions and low fees.",
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'SPL Standard',
      description:
        'Full compatibility with the Solana Program Library token standard for seamless integration.',
      icon: Coins,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Metadata Ready',
      description:
        'Integrated with Metaplex standards to ensure your tokens look great in every wallet.',
      icon: Palette,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
  ];

  const technologies = [
    { name: 'Solana', description: 'High-performance blockchain', icon: Globe },
    { name: 'Anchor', description: 'Smart contract framework', icon: Cpu },
    { name: 'React', description: 'Modern frontend library', icon: Layers },
    { name: 'Metaplex', description: 'NFT & Metadata standard', icon: Palette },
  ];

  const steps = [
    {
      title: 'Connect',
      description: "Link your wallet to access the platform's features safely.",
      icon: Shield,
    },
    {
      title: 'Configure',
      description:
        'Set token parameters, sale duration, and pricing structure.',
      icon: Layers,
    },
    {
      title: 'Launch',
      description: 'Deploy your sale to the mainnet and start raising capital.',
      icon: Rocket,
    },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-7xl font-bold font-display tracking-tight text-white leading-tight">
            The Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
              Fundraising on Solana
            </span>
          </h1>
          <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Launch your SPL tokens with ease. A decentralized, non-custodial
            platform built for the next generation of Solana projects.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all hover:scale-105 shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
            <Rocket className="w-5 h-5" />
            Launch Token
          </Link>
          <Link
            href="/market"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-card hover:bg-white/5 text-white font-bold transition-all border border-white/10 flex items-center justify-center gap-2">
            <Search className="w-5 h-5" />
            Browse Sales
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto pt-8">
          {[
            { label: 'Total Sales', value: sales?.length || 0 },
            { label: 'Live Now', value: allLiveSales.length },
            { label: 'Upcoming', value: upcomingSales.length },
            { label: 'Ended', value: endedSales.length },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-card/30 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Sales */}
      {liveSales.length > 0 && (
        <section className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Sales
              </h2>
              <p className="text-sm text-muted-foreground">
                Active token sales you can participate in right now
              </p>
            </div>
            <Link
              href="/market"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-white/5 border border-white/10 text-sm font-medium transition-all">
              View All Market
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 
          gap-6 [&>*:nth-child(5)]:hidden 2xl:[&>*:nth-child(5)]:block">
            {liveSales.map((sale) => (
              <SaleCard key={sale.publicKey.toString()} sale={sale} />
            ))}
          </div>
        </section>
      )}

      {/* video Section */}
      <section className="relative overflow-hidden">
        <div className="px-2 sm:px-6 pb-4 lg:px-8 ">
          <div className="relative h-[200px] lg:h-[400px] rounded-xl overflow-hidden shadow-xl max-w-4xl mx-auto border border-primary/20 ">
            {/* Video */}
            {isPlaying && (
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/6Agl_RfqFtU?autoplay=1"
                title="How to use Jocc"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}

            {/* Cover */}
            {!isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                <img
                  src="/video.jpg"
                  alt="Video cover"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Play Button */}
                <span className="relative z-20 w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">Built for Builders</h2>
          <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to launch, manage, and scale your token
            fundraising on the fastest blockchain.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-8 rounded-3xl bg-card/30 border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1">
              <div
                className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto py-12">
        <div className="rounded-[3rem] bg-gradient-to-b from-primary/5 to-transparent border border-white/5 p-8 md:p-16">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">How it Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Launch your project in minutes with our streamlined on-chain
              process.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative flex flex-col items-center justify-center text-center space-y-4">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[70%] w-[70%] border-t-2 border-dashed border-white/10" />
                )}
                <div className="w-24 h-24 rounded-full bg-card border-4 border-white/5 flex items-center justify-center relative z-10 shadow-xl">
                  <step.icon className="w-10 h-10 text-primary" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="container mx-auto">
        <div className="p-8 rounded-[3rem] bg-card/20 border border-white/5 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-2xl md:text-5xl font-bold">
              Powered by the best
            </h2>
            <p className="text-md md:text-lg text-muted-foreground">
              SPL is built using industry-standard technologies to ensure
              security, reliability, and the best possible user experience on
              Solana.
            </p>
            <div className="flex flex-wrap gap-4">
              {['Security First', 'Open Source', 'Community Driven'].map(
                (tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {tag}
                  </div>
                )
              )}
            </div>
          </div>
          <div className="lg:w-1/2 grid grid-cols-2 gap-4 w-full">
            {technologies.map((tech) => (
              <div
                key={tech.name}
                className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <tech.icon className="w-8 h-8 text-primary mb-4" />
                <h4 className="font-bold text-lg">{tech.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-md md:text-lg">
            Everything you need to know about the SPL platform and launching
            your token.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem
              value="item-1"
              className="bg-card/30 border border-white/5 rounded-2xl px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <span className="text-left font-bold text-md md:text-lg flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  What is SPL?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                SPL is a decentralized token sale platform on Solana. It allows
                project creators to launch SPL tokens and conduct sales directly
                on-chain without any central authority.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-2"
              className="bg-card/30 border border-white/5 rounded-2xl px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <span className="text-left font-bold text-md md:text-lg flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  Is it safe to use?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                Yes. All sales are managed by an immutable Anchor program on the
                Solana blockchain. Funds and tokens are handled by smart
                contracts, ensuring a trustless environment for both creators
                and buyers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-3"
              className="bg-card/30 border border-white/5 rounded-2xl px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <span className="text-left font-bold text-md md:text-lg flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  How fast are the transactions?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                Since we are built on Solana, transactions are near-instant and
                cost fractions of a cent. You can launch your sale or buy tokens
                in seconds.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-4"
              className="bg-card/30 border border-white/5 rounded-2xl px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <span className="text-left font-bold text-md md:text-lg flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-primary" />
                  How do I launch my token?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                Simply connect your wallet, navigate to the "Create Sale" page,
                and fill in your token details. Our platform handles the rest of
                the on-chain setup for you.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-5"
              className="bg-card/30 border border-white/5 rounded-2xl px-6">
              <AccordionTrigger className="hover:no-underline py-6">
                <span className="text-left font-bold text-md md:text-lg flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  What are the fees?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                Fundraising creation fee is 500 #JOCC . SPL does not deduct any
                percentage from the sale proceeds,
                <br /> the seller receives 100% of the funds, and tokens are
                delivered to the buyer instantly, without any waiting period.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Community Section */}
      <section className="container mx-auto">
        <div className="p-12 md:p-16 rounded-[3rem] bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border border-white/5 flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold">
              Join the SPL Community
            </h2>
            <p className="text-md md:text-lg text-muted-foreground">
              Connect with other builders and investors. Get support, share your
              project, and stay updated with the latest news from the SPL
              ecosystem.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://discord.gg/jmMY8MrQCt"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-xl bg-[#5865F2] hover:opacity-90 transition-all font-bold text-white flex items-center gap-2">
              Join Discord
            </a>
            <a
              href="https://x.com/joccspl"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-xl bg-black border border-white/10 hover:bg-white/5 transition-all font-bold text-white flex items-center gap-2">
              Follow on X
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto text-center">
        <div className="p-12 md:p-20 rounded-[3rem] bg-gradient-to-tr from-primary/20 via-purple-500/10 to-secondary/20 border border-primary/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-3xl md:text-6xl font-bold">
              Ready to launch your project?
            </h2>
            <p className="text-md md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Join dozens of projects already using SPL to raise capital and
              grow their communities.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/create"
                className="px-12 py-5 rounded-2xl bg-white text-black font-black 
                text-md md:text-xl hover:scale-105 transition-all shadow-2xl">
                Get Started Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
