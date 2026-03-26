"use client";

import { motion } from "framer-motion";


export default function AboutPage() {
  return (
    <section className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            About Me
          </h1>
          <div className="neon-line w-20 mb-4" />
        </motion.div>

        {/* Bio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass-light rounded-2xl p-8 glow-border mb-16"
        >
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar placeholder */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-accent-blue flex items-center justify-center">
                <span className="text-4xl font-bold text-white">AG</span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Anuraag Gupta
              </h2>
              <p className="text-gray-400 leading-relaxed mb-4">
                Hey there! I&apos;m Anuraag — a tech professional with over a decade of
                experience spanning network engineering, business analysis, data analytics,
                and sales management. My journey has taken me from electrical sites in Jaipur
                to investment banking floors in London, and now to managing enterprise
                renewals across the EMEA Italy region.
              </p>
              <p className="text-gray-400 leading-relaxed mb-4">
                What drives me is the intersection of technology and people. Whether
                it&apos;s solving a complex network issue at 2 AM or helping a client see the
                value in renewing their partnership, I believe great work happens when you
                genuinely care about the outcome.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Outside of work, I&apos;m passionate about giving back — I&apos;ve spent time
                volunteering with specially abled children, teaching them computer skills.
                I also speak Italian, which comes in handy when you&apos;re managing accounts
                across Italy!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Certifications & Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid sm:grid-cols-3 gap-4 mb-16"
        >
          <div className="glass-light rounded-xl p-5 glow-border text-center">
            <p className="text-2xl font-bold text-white mb-1">12+</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Years Experience</p>
          </div>
          <div className="glass-light rounded-xl p-5 glow-border text-center">
            <p className="text-2xl font-bold text-white mb-1">CCNA</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Cisco Certified</p>
          </div>
          <div className="glass-light rounded-xl p-5 glow-border text-center">
            <p className="text-2xl font-bold text-white mb-1">NISM</p>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Securities Markets</p>
          </div>
        </motion.div>

        {/* Philosophy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-light rounded-2xl p-8 glow-border mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-4">What I Believe In</h2>
          <blockquote className="border-l-2 border-accent pl-6">
            <p className="text-gray-400 italic leading-relaxed">
              &ldquo;Every role I&apos;ve held has taught me something different — engineering
              taught me precision, analytics taught me patterns, London taught me pace,
              and sales taught me empathy. The best solutions come when you bring all of
              those lenses together.&rdquo;
            </p>
          </blockquote>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-gray-500 mb-6">
            Want to connect or collaborate?
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.linkedin.com/in/anuragg-gupta-36609981/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-accent hover:bg-purple-500 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              Connect on LinkedIn
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
