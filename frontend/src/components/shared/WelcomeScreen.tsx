"use client";

import { MessageSquare, CheckCheck } from "lucide-react";
import { motion } from "motion/react";

export default function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5]"
    >
      <div className="w-[320px] h-[220px] mb-8 flex items-center justify-center">
        <div className="relative">
          {/* Outer circle - scale in with bounce */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="w-48 h-48 rounded-full bg-[#00a884]/10 flex items-center justify-center"
          >
            {/* Middle circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="w-32 h-32 rounded-full bg-[#00a884]/20 flex items-center justify-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <MessageSquare size={56} className="text-[#00a884]" />
              </motion.div>
            </motion.div>
          </motion.div>
          {/* Checkmark badge - pops in */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="absolute -top-2 -right-2 w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center shadow-lg"
          >
            <CheckCheck size={20} className="text-white" />
          </motion.div>
        </div>
      </div>
      {/* Welcome text */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.6,
          ease: "easeOut",
        }}
        className="text-3xl font-light text-gray-800 mb-3"
      >
        Welcome to WorkChat
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.75,
          ease: "easeOut",
        }}
        className="max-w-md text-sm text-gray-500 leading-relaxed"
      >
        Send and receive messages with your colleagues in real-time.
        Select a conversation from the sidebar to start chatting, or click <strong>+</strong> to start a new conversation.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.95,
        }}
        className="mt-10 flex items-center justify-center gap-2 text-xs text-gray-400"
      >
        <CheckCheck size={14} />
        <span>Secure & Private Messaging</span>
      </motion.div>
    </motion.div>
  );
}
