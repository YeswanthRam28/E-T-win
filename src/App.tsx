import { motion, useScroll, useTransform, useSpring, useInView } from "motion/react";
import React, { useRef, useEffect } from "react";
import { Scene3D } from "./components/Scene3D";
import { 
  Globe, 
  Zap, 
  Droplets, 
  Building2, 
  Users, 
  ArrowRight, 
  Activity, 
  Cpu, 
  ShieldCheck 
} from "lucide-react";

const RevealText = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: "100%" }}
        animate={isInView ? { y: 0 } : { y: "100%" }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1], delay }}
      >
        {children}
      </motion.div>
    </div>
  );
};

const FadeIn = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Building3D = ({ height = 100, color = "emerald" }: { height?: number, color?: string }) => {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/20 border-emerald-500/50",
    blue: "bg-blue-500/20 border-blue-500/50",
    amber: "bg-amber-500/20 border-amber-500/50",
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05, rotateY: 15 }}
      className="relative preserve-3d w-16 transition-all duration-500"
      style={{ height: `${height}px` }}
    >
      {/* Front */}
      <div className={`absolute inset-0 border ${colors[color]} backdrop-blur-sm`} />
      {/* Back */}
      <div className={`absolute inset-0 border ${colors[color]} [transform:translateZ(-20px)] opacity-50`} />
      {/* Left */}
      <div className={`absolute inset-y-0 left-0 w-[20px] border ${colors[color]} origin-left [transform:rotateY(-90deg)]`} />
      {/* Right */}
      <div className={`absolute inset-y-0 right-0 w-[20px] border ${colors[color]} origin-right [transform:rotateY(90deg)]`} />
      {/* Top */}
      <div className={`absolute inset-x-0 top-0 h-[20px] border ${colors[color]} origin-top [transform:rotateX(-90deg)]`} />
      
      {/* Data lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ y: [0, height] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-full h-[1px] bg-white/30"
        />
      </div>
    </motion.div>
  );
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 15]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.2], [1, 1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.1], ["blur(0px)", "blur(10px)"]);

  // Horizontal scroll logic
  const { scrollYProgress: horizontalScroll } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(horizontalScroll, [0, 1], ["0%", "-66.6%"]);
  const springX = useSpring(x, { stiffness: 100, damping: 30 });

  return (
    <div ref={containerRef} className="relative font-sans bg-black">
      <Scene3D scrollYProgress={scrollYProgress} />
      
      {/* Hero Section with Zoom Parallax */}
      <section className="sticky top-0 h-screen flex items-center justify-center overflow-hidden z-20">
        <motion.div 
          style={{ scale, opacity, filter: blur }}
          className="text-center z-10 px-4"
        >
          <div className="overflow-hidden">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
              className="text-[12vw] font-monoton leading-none tracking-tighter uppercase"
            >
              E&lt;T&gt;WIN
            </motion.h1>
          </div>
          <FadeIn delay={0.5}>
            <p className="max-w-xl mx-auto mt-8 text-zinc-400 text-lg md:text-xl font-light">
              Autonomous Policy Simulation through Multi-Agent Reinforcement Learning.
            </p>
          </FadeIn>
        </motion.div>

        {/* Background Grid Elements removed to show 3D Scene */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Intro Text */}
      <section className="relative h-screen flex items-center justify-center z-10 px-6">
        <div className="max-w-4xl">
          <RevealText className="mb-2">
            <h2 className="text-4xl md:text-6xl font-display font-medium leading-tight">
              Prediction is a relic.
            </h2>
          </RevealText>
          <RevealText delay={0.1}>
            <h2 className="text-4xl md:text-6xl font-display font-medium leading-tight">
              <span className="text-zinc-500 italic">Counterfactual simulation</span>
            </h2>
          </RevealText>
          <RevealText delay={0.2}>
            <h2 className="text-4xl md:text-6xl font-display font-medium leading-tight">
              is the future of governance.
            </h2>
          </RevealText>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12 text-zinc-400 text-lg">
            <FadeIn delay={0.4}>
              <p>
                E&lt;T&gt;WIN creates a high-fidelity digital twin of urban ecosystems, modeling the complex interplay between climate, economy, and social equity.
              </p>
            </FadeIn>
            <FadeIn delay={0.5}>
              <p>
                By leveraging Graph Neural Networks and Causal AI, we simulate years of policy impact in seconds, allowing leaders to stress-test decisions before they are made.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Vertical to Horizontal Storytelling */}
      <div ref={horizontalRef} className="relative h-[300vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <motion.div 
            style={{ x: springX }}
            className="flex h-full w-[300vw]"
          >
            {/* Slide 1: Climate */}
            <div className="w-screen h-full flex items-center justify-center px-6 md:px-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-7xl">
                <div>
                  <FadeIn>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8">
                      <Globe size={32} />
                    </div>
                  </FadeIn>
                  <RevealText>
                    <h3 className="text-5xl md:text-7xl font-display font-bold mb-6">CLIMATE<br/>DYNAMICS</h3>
                  </RevealText>
                  <FadeIn delay={0.2}>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                      Real-time atmospheric modeling integrated with urban heat island effects. Simulate carbon sequestration policies and flood resilience strategies.
                    </p>
                  </FadeIn>
                </div>
                <FadeIn delay={0.4} className="relative aspect-square bg-zinc-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden group">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex gap-4 items-end">
                      <Building3D height={120} color="emerald" />
                      <Building3D height={200} color="emerald" />
                      <Building3D height={150} color="emerald" />
                      <Building3D height={280} color="emerald" />
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>

            {/* Slide 2: Economy */}
            <div className="w-screen h-full flex items-center justify-center px-6 md:px-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-7xl">
                <div className="order-2 lg:order-1 relative aspect-square bg-zinc-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      whileInView={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0]
                      }}
                      transition={{ duration: 10, repeat: Infinity }}
                      className="w-64 h-64 border-2 border-blue-500/30 rounded-full flex items-center justify-center"
                    >
                      <div className="w-48 h-48 border border-blue-500/20 rounded-full flex items-center justify-center">
                        <Cpu className="text-blue-500" size={48} />
                      </div>
                    </motion.div>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <FadeIn>
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-8">
                      <Zap size={32} />
                    </div>
                  </FadeIn>
                  <RevealText>
                    <h3 className="text-5xl md:text-7xl font-display font-bold mb-6">ECONOMIC<br/>FLOW</h3>
                  </RevealText>
                  <FadeIn delay={0.2}>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                      Agent-based modeling of micro-economies. Test the impact of subsidies, tax shifts, and universal basic income on local district prosperity.
                    </p>
                  </FadeIn>
                </div>
              </div>
            </div>

            {/* Slide 3: Social */}
            <div className="w-screen h-full flex items-center justify-center px-6 md:px-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full max-w-7xl">
                <div>
                  <FadeIn>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 mb-8">
                      <Users size={32} />
                    </div>
                  </FadeIn>
                  <RevealText>
                    <h3 className="text-5xl md:text-7xl font-display font-bold mb-6">SOCIAL<br/>EQUITY</h3>
                  </RevealText>
                  <FadeIn delay={0.2}>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                      Mapping inequality shifts through causal AI. Understand how infrastructure changes affect marginalized communities before breaking ground.
                    </p>
                  </FadeIn>
                </div>
                <FadeIn delay={0.4} className="relative aspect-square bg-zinc-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden">
                  <div className="absolute inset-0 p-12 flex flex-col justify-between">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div 
                        key={i}
                        initial={{ width: "30%" }}
                        whileInView={{ width: `${30 + i * 15}%` }}
                        className="h-4 bg-amber-500/20 rounded-full overflow-hidden"
                      >
                        <motion.div 
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                          className="w-24 h-full bg-amber-500/40"
                        />
                      </motion.div>
                    ))}
                  </div>
                </FadeIn>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SDG Section */}
      <section className="relative z-10 min-h-screen flex items-center py-32 px-6 bg-white text-black">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <RevealText>
              <h2 className="text-6xl md:text-8xl font-display font-bold tracking-tighter uppercase leading-none">
                Aligned with <br /> the Agenda.
              </h2>
            </RevealText>
            <FadeIn delay={0.3}>
              <p className="max-w-md text-zinc-600 text-lg">
                Our simulation engine is built on the framework of the United Nations Sustainable Development Goals.
              </p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {[
              { icon: <Globe />, title: "Climate Action", id: "13" },
              { icon: <Building2 />, title: "Sustainable Cities", id: "11" },
              { icon: <Droplets />, title: "Clean Water", id: "06" },
              { icon: <Zap />, title: "Clean Energy", id: "07" },
              { icon: <Users />, title: "Reduced Inequalities", id: "10" },
              { icon: <ShieldCheck />, title: "Strong Institutions", id: "16" },
            ].map((sdg, idx) => (
              <div key={idx}>
                <FadeIn delay={idx * 0.1}>
                  <div className="group h-full relative p-12 border border-black/10 hover:bg-black hover:text-white transition-colors duration-500">
                    <span className="absolute top-8 right-8 font-mono text-sm opacity-30">SDG {sdg.id}</span>
                    <div className="mb-8">{sdg.icon}</div>
                    <h4 className="text-2xl font-display font-bold uppercase">{sdg.title}</h4>
                    <div className="mt-8 flex items-center gap-2 text-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      VIEW METRICS <ArrowRight size={14} />
                    </div>
                  </div>
                </FadeIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FadeIn delay={0.1}>
              <div className="group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Activity size={20} />
                  </div>
                  <h4 className="text-lg font-display font-bold uppercase tracking-widest">Documentation</h4>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed font-mono uppercase tracking-tight">
                  Access the full technical specification of the Multi-Agent Kernel and Graph Neural Network architecture. Version 1.0.4 stable release.
                </p>
                <div className="mt-6 h-[1px] w-full bg-white/5 group-hover:bg-emerald-500/30 transition-colors" />
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="text-lg font-display font-bold uppercase tracking-widest">Privacy</h4>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed font-mono uppercase tracking-tight">
                  Our Zero-Knowledge Proof (ZKP) protocol ensures all urban data remains encrypted and sovereign to the local municipality.
                </p>
                <div className="mt-6 h-[1px] w-full bg-white/5 group-hover:bg-blue-500/30 transition-colors" />
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Cpu size={20} />
                  </div>
                  <h4 className="text-lg font-display font-bold uppercase tracking-widest">Terminal</h4>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed font-mono uppercase tracking-tight">
                  Direct interface to the simulation engine. Requires Level 4 clearance for autonomous policy execution and kernel debugging.
                </p>
                <div className="mt-6 h-[1px] w-full bg-white/5 group-hover:bg-amber-500/30 transition-colors" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>© 2026 E&lt;T&gt;WIN DIGITAL TWIN SYSTEMS</div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terminal</a>
        </div>
      </footer>

      {/* CTA Section - Now at the absolute end */}
      <section className="py-64 px-6 text-center relative overflow-hidden border-t border-white/5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-3xl mx-auto relative z-10"
        >
          <RevealText className="mb-12">
            <h2 className="text-5xl md:text-8xl font-display font-bold tracking-tighter uppercase">
              Start the <br /> Simulation.
            </h2>
          </RevealText>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-12 py-6 bg-emerald-500 text-black font-display font-bold text-xl uppercase tracking-widest overflow-hidden transition-all hover:pr-16"
          >
            <span className="relative z-10">Request Access</span>
            <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" />
          </motion.button>
          <FadeIn delay={0.4}>
            <p className="mt-12 font-mono text-xs text-zinc-500 tracking-widest">
              V.1.0.4 // MULTI-AGENT KERNEL ACTIVE
            </p>
          </FadeIn>
        </motion.div>
      </section>
    </div>
  );
}
